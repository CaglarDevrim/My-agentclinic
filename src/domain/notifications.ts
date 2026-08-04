export interface NotificationContactInput {
  email: string;
  consent: boolean;
}

export interface NotificationContactValidation {
  input?: NotificationContactInput;
  errors: { email?: string; notificationConsent?: string };
}

const EMAIL_PATTERN = /^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/;

export function normalizeNotificationEmail(value: string): string {
  const trimmed = value.trim();
  const separator = trimmed.lastIndexOf("@");
  if (separator < 0) return trimmed;
  return `${trimmed.slice(0, separator)}@${trimmed.slice(separator + 1).toLowerCase()}`;
}

export function validateNotificationContact(emailValue: string, consent: boolean): NotificationContactValidation {
  const email = normalizeNotificationEmail(emailValue);
  const errors: NotificationContactValidation["errors"] = {};
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid notification email address.";
  }
  if (!consent) {
    errors.notificationConsent = "Confirm that AgentClinic may send appointment notifications.";
  }
  return Object.keys(errors).length ? { errors } : { input: { email, consent: true }, errors };
}
