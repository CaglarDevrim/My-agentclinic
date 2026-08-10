import { describe, expect, it } from "vitest";

import { validateFeedback, type FeedbackValues } from "../src/domain/feedback.js";

const validValues: FeedbackValues = {
  name: " Patch ",
  email: " PATCH@Example.COM ",
  message: " A calm and restorative clinic visit. ",
  rating: "5",
  publicConsent: false,
};

describe("feedback validation", () => {
  it("normalizes valid feedback without changing internal message content", () => {
    const result = validateFeedback({ ...validValues, message: " First line.\nSecond line. " });
    expect(result.errors).toEqual({});
    expect(result.input).toEqual({
      name: "Patch",
      email: "patch@example.com",
      message: "First line.\nSecond line.",
      rating: 5,
      publicConsent: false,
    });
  });

  it.each([
    ["empty name", { name: " " }, "name"],
    ["long name", { name: "n".repeat(101) }, "name"],
    ["empty email", { email: " " }, "email"],
    ["invalid email", { email: "not-an-email" }, "email"],
    ["multiple emails", { email: "one@example.com,two@example.com" }, "email"],
    ["long email", { email: `${"a".repeat(244)}@example.com` }, "email"],
    ["short message", { message: "123456789" }, "message"],
    ["long message", { message: "m".repeat(2001) }, "message"],
    ["missing rating", { rating: "" }, "rating"],
    ["low rating", { rating: "0" }, "rating"],
    ["high rating", { rating: "6" }, "rating"],
    ["decimal rating", { rating: "1.5" }, "rating"],
    ["text rating", { rating: "five" }, "rating"],
  ] as const)("rejects %s", (_label, replacement, field) => {
    const result = validateFeedback({ ...validValues, ...replacement });
    expect(result.input).toBeUndefined();
    expect(result.errors[field]).toBeTruthy();
  });

  it.each(["1", "2", "3", "4", "5"])("accepts rating %s", (rating) => {
    expect(validateFeedback({ ...validValues, rating }).input?.rating).toBe(Number(rating));
  });

  it.each([
    ["one-character name", { name: "A" }],
    ["100-character name", { name: "n".repeat(100) }],
    ["10-character message", { message: "m".repeat(10) }],
    ["2,000-character message", { message: "m".repeat(2_000) }],
  ] as const)("accepts the %s boundary", (_label, replacement) => {
    expect(validateFeedback({ ...validValues, ...replacement }).errors).toEqual({});
  });

  it("accepts consent as an optional boolean", () => {
    expect(validateFeedback({ ...validValues, publicConsent: true }).input?.publicConsent).toBe(true);
  });
});
