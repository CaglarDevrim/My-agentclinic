export interface StaffIdentity {
  id: number;
  email: string;
  displayName: string;
}

export interface StaffAccountSecret extends StaffIdentity {
  passwordHash: string;
  isActive: boolean;
}

export interface AuthenticatedStaff extends StaffIdentity {
  sessionToken: string;
  csrfToken: string;
  expiresAt: string;
}

export type CredentialResult =
  | { status: "authenticated"; staff: StaffIdentity }
  | { status: "invalid" }
  | { status: "throttled"; retryAfter: number };
