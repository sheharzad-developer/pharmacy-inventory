import { describe, expect, it } from "vitest";
import { isDisposableEmail, isValidEmailSyntax, normalizeEmail } from "./emailValidation";

describe("email validation", () => {
  it("rejects invalid syntax", () => {
    expect(isValidEmailSyntax("not-an-email")).toBe(false);
    expect(isValidEmailSyntax("")).toBe(false);
  });

  it("accepts simple valid syntax", () => {
    expect(isValidEmailSyntax("user@example.com")).toBe(true);
  });

  it("normalizes case", () => {
    expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com");
  });

  it("flags disposable domains when applicable", () => {
    expect(isDisposableEmail("a@mailinator.com")).toBe(true);
    expect(isDisposableEmail("a@gmail.com")).toBe(false);
  });
});
