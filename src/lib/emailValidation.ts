import { isDisposableEmail as isDisposableEmailFromLib } from "disposable-email-domains-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmailSyntax(email: string) {
  return EMAIL_REGEX.test(email);
}

export function isDisposableEmail(email: string) {
  return isDisposableEmailFromLib(email);
}

