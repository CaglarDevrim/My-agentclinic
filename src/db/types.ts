export type AgentStatus = "active" | "on_leave" | "discharged";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled";
export type StaffRole = "staff" | "therapist";
export type NotificationEventKind = "appointment_created" | "appointment_confirmed" | "appointment_cancelled" | "appointment_reminder_24h";
export type NotificationState = "pending" | "processing" | "processed" | "failed" | "suppressed";

export interface ClinicSite {
  id: number;
  slug: string;
  name: string;
  address: string;
  is_active: 0 | 1;
}

export interface AgentRecord {
  id: number;
  name: string;
  model: string;
  status: AgentStatus;
  description: string;
}

export interface AilmentRecord {
  id: number;
  name: string;
  description: string;
}

export interface TherapyRecord {
  id: number;
  name: string;
  description: string;
}

export interface AppointmentRecord {
  id: number;
  agent_id: number;
  agent_name: string;
  therapist_name: string;
  therapist_id: number | null;
  slot_id: number | null;
  site_id: number;
  site_slug: string;
  site_name: string;
  site_address: string;
  scheduled_at: string;
  status: AppointmentStatus;
  notification_email?: string | null;
  notification_consent_at?: string | null;
  created_at: string;
}

export interface NotificationDelivery {
  id: number;
  appointment_id: number;
  event_kind: NotificationEventKind;
  recipient_email: string;
  scheduled_for: string;
  attempt_count: number;
  agent_name: string;
  therapist_name: string;
  appointment_scheduled_at: string;
  site_name: string;
  site_address: string;
}

export interface AvailableSlot {
  id: number;
  therapist_id: number;
  therapist_name: string;
  scheduled_at: string;
  site_id: number;
  site_slug: string;
  site_name: string;
  site_address: string;
}

export interface TherapistSlot extends AvailableSlot {
  is_active: 0 | 1;
  is_occupied: 0 | 1;
}

export interface TherapistSummary {
  id: number;
  display_name: string;
  is_active: 0 | 1;
  account_email: string | null;
  upcoming_slots: number;
}

export interface AilmentSummary extends AilmentRecord {
  agent_count: number;
  agents: string[];
  therapies: TherapyRecord[];
}

export interface TherapySummary extends TherapyRecord {
  ailments: AilmentRecord[];
}

export interface AgentDetail extends AgentRecord {
  ailments: AilmentSummary[];
  therapies: TherapyRecord[];
}

export interface DashboardData {
  totalAgents: number;
  openAppointments: number;
  activeAilments: number;
  pendingReviews: number;
  agents: AgentRecord[];
  appointments: AppointmentRecord[];
  ailments: Array<AilmentRecord & { agent_count: number }>;
  selectedSite: ClinicSite | null;
}

export interface ReportDateRange {
  from: string;
  to: string;
  fromInclusive: string;
  toExclusive: string;
}

export interface ClinicReportTotals {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
}

export interface TherapistWorkload {
  therapist_name: string;
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
}

export interface AgentDemand {
  agent_id: number;
  agent_name: string;
  total: number;
}

export interface ReportAppointmentRow {
  scheduled_at: string;
  agent_name: string;
  therapist_name: string;
  site_name: string;
  status: AppointmentStatus;
}

export interface ClinicReport {
  range: ReportDateRange;
  totals: ClinicReportTotals;
  therapistWorkload: TherapistWorkload[];
  agentDemand: AgentDemand[];
  selectedSite: ClinicSite | null;
}

export interface FeedbackInput {
  name: string;
  email: string;
  message: string;
  rating: number;
  publicConsent: boolean;
}

export interface FeedbackRecord {
  id: number;
  name: string;
  email: string;
  message: string;
  rating: number;
  public_consent: 0 | 1;
  created_at: string;
  approved_at: string | null;
}

export interface ReviewModerationItem {
  id: number;
  name: string;
  message: string;
  rating: number;
  created_at: string;
  approved_at: string | null;
}

export interface PublicReview {
  name: string;
  message: string;
  rating: number;
}
