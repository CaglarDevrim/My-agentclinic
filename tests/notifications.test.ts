import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { cancelAppointment, confirmAppointment, createAppointmentFromSlot, openDatabase, type ClinicDatabase } from "../src/db/index.js";
import type { NotificationDelivery } from "../src/db/types.js";
import { LocalPreviewTransport, processDueNotifications, renderNotification, type NotificationMessage, type NotificationTransport } from "../src/notifications.js";

class RecordingTransport implements NotificationTransport {
  deliveries: Array<{ notification: NotificationDelivery; message: NotificationMessage }> = [];
  failuresRemaining = 0;

  async deliver(notification: NotificationDelivery, message: NotificationMessage): Promise<void> {
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new Error("Synthetic transport failure with private@example.com");
    }
    this.deliveries.push({ notification, message });
  }
}

async function seededSlotId(db: ClinicDatabase, scheduledAt = "2099-04-10T10:00"): Promise<number> {
  return Number((await db.execute({
    sql: "SELECT id FROM therapist_slots WHERE scheduled_at = ?",
    args: [scheduledAt],
  })).rows[0].id);
}

describe("visitor notifications and reminders", () => {
  it("validates contact consent without leaking the submitted address", async () => {
    const db = await openDatabase();
    try {
      const logs: string[] = [];
      const now = new Date("2099-04-08T10:00:00");
      const app = createApp(db, { now: () => now, logger: (message) => logs.push(message) });
      const slotId = await seededSlotId(db);
      const page = await app.request("/agents/1/appointments/new");
      const pageHtml = await page.text();
      expect(pageHtml).toContain('type="email"');
      expect(pageHtml).toContain('name="notificationConsent"');

      const invalid = await app.request("/agents/1/appointments", {
        method: "POST",
        body: new URLSearchParams({ slotId: String(slotId), email: "private@example.com" }),
      });
      const invalidHtml = await invalid.text();
      expect(invalid.status).toBe(422);
      expect(invalidHtml).toContain("Confirm that AgentClinic may send appointment notifications.");
      expect(logs.join(" ")).not.toContain("private@example.com");
      expect(Number((await db.execute("SELECT COUNT(*) AS count FROM notification_outbox")).rows[0].count)).toBe(0);

      const duplicated = new URLSearchParams({ slotId: String(slotId), email: "first@example.com", notificationConsent: "yes" });
      duplicated.append("email", "second@example.com");
      const duplicateResponse = await app.request("/agents/1/appointments", { method: "POST", body: duplicated });
      expect(duplicateResponse.status).toBe(422);
      expect(await duplicateResponse.text()).not.toContain("second@example.com");
    } finally {
      db.close();
    }
  });

  it("atomically stores normalized contact data and one eligible reminder", async () => {
    const db = await openDatabase();
    try {
      const now = new Date("2099-04-08T09:59:00");
      const result = await createAppointmentFromSlot(db, {
        agentId: 1,
        slotId: await seededSlotId(db),
        now,
        notificationEmail: "Visitor.Name@EXAMPLE.COM",
      });
      expect(result.status).toBe("created");
      if (result.status !== "created") throw new Error("Expected booking creation.");
      const appointment = (await db.execute({
        sql: "SELECT notification_email, notification_consent_at FROM appointments WHERE id = ?",
        args: [result.appointmentId],
      })).rows[0];
      expect(appointment.notification_email).toBe("Visitor.Name@example.com");
      expect(appointment.notification_consent_at).toBe("2099-04-08T09:59");
      const events = (await db.execute({
        sql: "SELECT event_kind, scheduled_for FROM notification_outbox WHERE appointment_id = ? ORDER BY event_kind",
        args: [result.appointmentId],
      })).rows;
      expect(events).toEqual([
        expect.objectContaining({ event_kind: "appointment_created", scheduled_for: "2099-04-08T09:59" }),
        expect.objectContaining({ event_kind: "appointment_reminder_24h", scheduled_for: "2099-04-09T10:00" }),
      ]);
    } finally {
      db.close();
    }
  });

  it("does not schedule a reminder at the exact 24-hour boundary", async () => {
    const db = await openDatabase();
    try {
      const result = await createAppointmentFromSlot(db, {
        agentId: 1,
        slotId: await seededSlotId(db),
        now: new Date("2099-04-09T10:00:00"),
        notificationEmail: "visitor@example.com",
      });
      expect(result.status).toBe("created");
      const kinds = (await db.execute("SELECT event_kind FROM notification_outbox ORDER BY id")).rows.map((row) => row.event_kind);
      expect(kinds).toEqual(["appointment_created"]);
    } finally {
      db.close();
    }
  });

  it("creates idempotent transition events and suppresses cancellation reminders", async () => {
    const db = await openDatabase();
    try {
      const booking = await createAppointmentFromSlot(db, {
        agentId: 1,
        slotId: await seededSlotId(db),
        now: new Date("2099-04-08T10:00:00"),
        notificationEmail: "visitor@example.com",
      });
      if (booking.status !== "created") throw new Error("Expected booking creation.");
      await expect(confirmAppointment(db, booking.appointmentId, undefined, new Date("2099-04-08T11:00:00"))).resolves.toBe("updated");
      await expect(confirmAppointment(db, booking.appointmentId, undefined, new Date("2099-04-08T11:01:00"))).resolves.toBe("unchanged");
      await expect(cancelAppointment(db, booking.appointmentId, undefined, new Date("2099-04-08T12:00:00"))).resolves.toBe("updated");
      await expect(cancelAppointment(db, booking.appointmentId, undefined, new Date("2099-04-08T12:01:00"))).resolves.toBe("unchanged");

      const events = (await db.execute({
        sql: "SELECT event_kind, state, COUNT(*) AS count FROM notification_outbox WHERE appointment_id = ? GROUP BY event_kind, state ORDER BY event_kind",
        args: [booking.appointmentId],
      })).rows;
      expect(events).toEqual([
        expect.objectContaining({ event_kind: "appointment_cancelled", state: "pending", count: 1 }),
        expect.objectContaining({ event_kind: "appointment_confirmed", state: "pending", count: 1 }),
        expect.objectContaining({ event_kind: "appointment_created", state: "pending", count: 1 }),
        expect.objectContaining({ event_kind: "appointment_reminder_24h", state: "suppressed", count: 1 }),
      ]);
    } finally {
      db.close();
    }
  });

  it("processes due work once and retries a failed preview on the next run", async () => {
    const db = await openDatabase();
    try {
      const now = new Date("2099-04-08T10:00:00");
      const booking = await createAppointmentFromSlot(db, {
        agentId: 1,
        slotId: await seededSlotId(db),
        now,
        notificationEmail: "visitor@example.com",
      });
      if (booking.status !== "created") throw new Error("Expected booking creation.");
      const transport = new RecordingTransport();
      transport.failuresRemaining = 1;

      await expect(processDueNotifications(db, transport, now)).resolves.toMatchObject({ processed: 0, failed: 1 });
      expect((await db.execute("SELECT state, attempt_count, last_error FROM notification_outbox WHERE event_kind = 'appointment_created'")).rows[0]).toMatchObject({
        state: "failed",
        attempt_count: 1,
        last_error: "Preview transport failed",
      });
      expect(JSON.stringify((await db.execute("SELECT last_error FROM notification_outbox")).rows)).not.toContain("private@example.com");

      await expect(processDueNotifications(db, transport, now)).resolves.toMatchObject({ processed: 1, failed: 0 });
      await expect(processDueNotifications(db, transport, now)).resolves.toMatchObject({ processed: 0, failed: 0 });
      expect(transport.deliveries).toHaveLength(1);
      expect(transport.deliveries[0].notification.event_kind).toBe("appointment_created");
      expect(transport.deliveries[0].message.text).toContain("Bartholomew-47B with Dr Evelyn Watts");
      expect(transport.deliveries[0].message.text).toContain("Site: Context Window Clinic");
      expect(transport.deliveries[0].message.text).toContain("42 Context Window Way");
      expect((await db.execute("SELECT attempt_count FROM notification_outbox WHERE event_kind = 'appointment_created'")).rows[0].attempt_count).toBe(2);
    } finally {
      db.close();
    }
  });

  it("escapes visitor-facing notification content", () => {
    const message = renderNotification({
      id: 1,
      appointment_id: 1,
      event_kind: "appointment_created",
      recipient_email: "visitor@example.com",
      scheduled_for: "2099-04-08T10:00",
      attempt_count: 1,
      agent_name: "<script>alert(1)</script>",
      therapist_name: "Dr & Co",
      appointment_scheduled_at: "2099-04-10T10:00",
      site_name: "Context Window Clinic",
      site_address: "42 Context Window Way, San Francisco, CA 94107",
    });
    expect(message.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(message.html).toContain("Dr &amp; Co");
    expect(message.html).toContain("Context Window Clinic");
    expect(message.html).not.toContain("<script>alert(1)</script>");
  });

  it("writes opaque local HTML and text preview artifacts", async () => {
    const directory = mkdtempSync(join(tmpdir(), "agentclinic-notification-preview-"));
    const notification: NotificationDelivery = {
      id: 42,
      appointment_id: 9,
      event_kind: "appointment_reminder_24h",
      recipient_email: "private.visitor@example.com",
      scheduled_for: "2099-04-09T10:00",
      attempt_count: 1,
      agent_name: "Bartholomew-47B",
      therapist_name: "Dr Evelyn Watts",
      appointment_scheduled_at: "2099-04-10T10:00",
      site_name: "Context Window Clinic",
      site_address: "42 Context Window Way, San Francisco, CA 94107",
    };
    await new LocalPreviewTransport(directory).deliver(notification, renderNotification(notification));
    const filenames = readdirSync(directory).sort();
    expect(filenames).toEqual(["42-appointment_reminder_24h.html", "42-appointment_reminder_24h.txt"]);
    const contents = filenames.map((filename) => readFileSync(join(directory, filename), "utf8")).join("\n");
    expect(contents).toContain("Appointment reminder");
    expect(contents).toContain("2099-04-10 at 10:00");
    expect(contents).not.toContain("private.visitor@example.com");
  });
});
