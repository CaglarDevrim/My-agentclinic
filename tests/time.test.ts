import { describe, expect, it } from "vitest";

import { localMinuteInZone, resolveLocalMinute, utcBoundaryForLocalDate, utcMinute } from "../src/domain/time.js";

describe("timezone coordination", () => {
  it("resolves ordinary winter and summer wall times without using the server zone", () => {
    expect(resolveLocalMinute("2026-01-15T10:00", "America/Los_Angeles")).toEqual({ status: "valid", utc: "2026-01-15T18:00Z" });
    expect(resolveLocalMinute("2026-07-15T10:00", "America/Los_Angeles")).toEqual({ status: "valid", utc: "2026-07-15T17:00Z" });
    expect(localMinuteInZone(new Date("2026-07-15T17:00:00Z"), "America/Los_Angeles")).toBe("2026-07-15T10:00");
  });

  it("identifies spring gaps and autumn overlaps explicitly", () => {
    expect(resolveLocalMinute("2026-03-08T02:30", "America/Los_Angeles")).toEqual({ status: "nonexistent" });
    expect(resolveLocalMinute("2026-11-01T01:30", "America/Los_Angeles")).toEqual({
      status: "ambiguous",
      candidates: ["2026-11-01T08:30Z", "2026-11-01T09:30Z"],
    });
  });

  it("rejects malformed values and computes local calendar boundaries", () => {
    expect(resolveLocalMinute("2026-02-30T10:00", "America/Los_Angeles")).toEqual({ status: "invalid" });
    expect(resolveLocalMinute("2026-01-01T10:00+03:00", "America/Los_Angeles")).toEqual({ status: "invalid" });
    expect(resolveLocalMinute("2026-01-01T10:00", "Not/AZone")).toEqual({ status: "invalid" });
    expect(utcBoundaryForLocalDate("2026-03-08", "America/Los_Angeles")).toBe("2026-03-08T08:00Z");
    expect(utcBoundaryForLocalDate("2026-03-09", "America/Los_Angeles")).toBe("2026-03-09T07:00Z");
    expect(utcMinute(new Date("2026-03-08T08:00:59Z"))).toBe("2026-03-08T08:00Z");
  });
});
