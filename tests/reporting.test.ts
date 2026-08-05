import { beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { createStaffSession } from "../src/auth/service.js";
import { hashStaffPassword, SESSION_COOKIE_NAME } from "../src/auth/security.js";
import { createStaffUser, createTherapistUser } from "../src/auth/store.js";
import { getClinicReport, listReportAppointments, openDatabase, type ClinicDatabase } from "../src/db/index.js";
import { parseReportDateRange, reportCsvFilename, serializeAppointmentReportCsv } from "../src/domain/reporting.js";

const PASSWORD = "Reporting test password 2026!";

function range(from: string, to: string) {
  const result = parseReportDateRange([from], [to], new Date("2026-08-05T10:00:00"));
  if (!result.range) throw new Error("Expected a valid report range.");
  return result.range;
}

describe("clinic operations reporting", () => {
  let passwordHash = "";

  beforeAll(async () => {
    passwordHash = await hashStaffPassword(PASSWORD);
  });

  it("normalizes defaults and enforces real inclusive ranges", () => {
    const defaults = parseReportDateRange([], [], new Date("2028-02-14T10:00:00"));
    expect(defaults).toMatchObject({ values: { from: "2028-02-01", to: "2028-02-29" }, range: { fromInclusive: "2028-02-01T00:00", toExclusive: "2028-03-01T00:00" } });
    expect(parseReportDateRange(["2028-01-01"], ["2028-12-31"], new Date()).range).toBeDefined();
    expect(parseReportDateRange(["2027-01-01"], ["2028-01-02"], new Date()).errors.to).toContain("366 days or fewer");
    expect(parseReportDateRange(["2026-08-05"], ["2026-08-04"], new Date()).errors.to).toContain("on or after");
    expect(parseReportDateRange(["2026-02-29"], ["2026-03-01"], new Date()).errors.from).toContain("real start date");
    expect(parseReportDateRange(["2026-01-01", "2026-01-02"], ["2026-01-31"], new Date())).toMatchObject({ values: { from: "", to: "2026-01-31" }, errors: { from: "Enter the start date only once." } });
    expect(parseReportDateRange(["2026-01-01"], [], new Date()).errors.to).toBe("Enter an end date.");
  });

  it("aggregates status, therapist workload, agent demand, and inclusive boundaries", async () => {
    const db = await openDatabase();
    try {
      await db.execute("INSERT INTO appointments (agent_id, therapist_name, scheduled_at, status) VALUES (1, 'Dr Boundary', '2099-04-01T00:00', 'pending')");
      await db.execute("INSERT INTO appointments (agent_id, therapist_name, scheduled_at, status) VALUES (2, 'Dr Boundary', '2099-04-30T23:59', 'confirmed')");
      await db.execute("INSERT INTO appointments (agent_id, therapist_name, scheduled_at, status) VALUES (3, 'Dr Excluded', '2099-05-01T00:00', 'cancelled')");
      const reportRange = range("2099-04-01", "2099-04-30");
      const report = await getClinicReport(db, reportRange);
      expect(report.totals).toEqual({ total: 2, pending: 1, confirmed: 1, cancelled: 0 });
      expect(report.therapistWorkload).toEqual([{ therapist_name: "Dr Boundary", total: 2, pending: 1, confirmed: 1, cancelled: 0 }]);
      expect(report.agentDemand).toEqual([
        expect.objectContaining({ agent_name: "Bartholomew-47B", total: 1 }),
        expect.objectContaining({ agent_name: "Penelope-mini", total: 1 }),
      ]);
      expect(await listReportAppointments(db, reportRange)).toHaveLength(2);
    } finally {
      db.close();
    }
  });

  it("serializes deterministic private-data-free and spreadsheet-safe CSV", async () => {
    const db = await openDatabase();
    try {
      await db.execute("UPDATE agents SET name = '=HYPERLINK(\"https://evil.example\")' WHERE id = 1");
      await db.execute({
        sql: "UPDATE appointments SET therapist_name = ?, notification_email = ?, notification_consent_at = ? WHERE id = 1",
        args: ["Dr, \"Quoted\"", "private@example.com", "2099-01-01T00:00"],
      });
      const reportRange = range("2099-01-01", "2099-01-31");
      const csv = serializeAppointmentReportCsv(await listReportAppointments(db, reportRange));
      expect(csv).toBe("Scheduled at,Agent,Therapist,Status\r\n2099-01-15T10:00,\"'=HYPERLINK(\"\"https://evil.example\"\")\",\"Dr, \"\"Quoted\"\"\",confirmed\r\n");
      expect(csv).not.toContain("private@example.com");
      expect(reportCsvFilename(reportRange)).toBe("agentclinic-appointments-2099-01-01-to-2099-01-31.csv");
      expect(serializeAppointmentReportCsv([])).toBe("Scheduled at,Agent,Therapist,Status\r\n");
    } finally {
      db.close();
    }
  });

  it("protects HTML and CSV routes by role and validates filters", async () => {
    const db = await openDatabase();
    try {
      const now = new Date("2026-08-05T10:00:00");
      const staffId = await createStaffUser(db, { email: "reports@example.com", displayName: "Report Staff", passwordHash });
      const staffSession = await createStaffSession(db, { id: staffId, email: "reports@example.com", displayName: "Report Staff" }, now);
      const staffCookie = `${SESSION_COOKIE_NAME}=${staffSession.sessionToken}`;
      const therapist = await createTherapistUser(db, { email: "report-therapist@example.com", displayName: "Dr Report", passwordHash });
      const therapistSession = await createStaffSession(db, { id: therapist.staffId, email: "report-therapist@example.com", displayName: "Dr Report", role: "therapist", therapistId: therapist.therapistId }, now);
      const therapistCookie = `${SESSION_COOKIE_NAME}=${therapistSession.sessionToken}`;
      const app = createApp(db, { now: () => now, logger: () => undefined });

      const anonymous = await app.request("/dashboard/reports?from=2099-01-01&to=2099-03-31");
      expect(anonymous.status).toBe(303);
      expect(anonymous.headers.get("location")).toContain("returnTo=%2Fdashboard%2Freports%3Ffrom%3D2099-01-01%26to%3D2099-03-31");
      expect((await app.request("/dashboard/reports", { headers: { cookie: therapistCookie } })).status).toBe(403);
      expect((await app.request("/dashboard/reports.csv?from=2099-01-01&to=2099-03-31", { headers: { cookie: therapistCookie } })).status).toBe(403);

      const report = await app.request("/dashboard/reports?from=2099-01-01&to=2099-03-31", { headers: { cookie: staffCookie } });
      const html = await report.text();
      expect(report.status).toBe(200);
      expect(report.headers.get("cache-control")).toBe("no-store");
      expect(html).toContain("Total appointments");
      expect(html).toContain("Therapist workload");
      expect(html).toContain('href="/dashboard/reports" aria-current="page"');
      expect(html).not.toContain("private@example.com");

      const invalid = await app.request("/dashboard/reports?from=2099-03-31&to=2099-01-01", { headers: { cookie: staffCookie } });
      expect(invalid.status).toBe(422);
      expect(await invalid.text()).toContain("Choose an end date on or after the start date.");
      const invalidCsv = await app.request("/dashboard/reports.csv?from=bad&to=2099-01-01", { headers: { cookie: staffCookie } });
      expect(invalidCsv.status).toBe(422);
      expect(await invalidCsv.text()).toBe("Enter a valid report date range.");

      const csv = await app.request("/dashboard/reports.csv?from=2099-01-01&to=2099-03-31", { headers: { cookie: staffCookie } });
      expect(csv.status).toBe(200);
      expect(csv.headers.get("content-type")).toContain("text/csv; charset=utf-8");
      expect(csv.headers.get("content-disposition")).toContain("agentclinic-appointments-2099-01-01-to-2099-03-31.csv");
      expect((await csv.text()).split("\r\n")).toHaveLength(5);
      const head = await app.request("/dashboard/reports.csv?from=2099-01-01&to=2099-03-31", { method: "HEAD", headers: { cookie: staffCookie } });
      expect(head.status).toBe(200);
      expect(await head.text()).toBe("");
    } finally {
      db.close();
    }
  });
});
