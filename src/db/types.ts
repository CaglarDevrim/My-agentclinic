export type AgentStatus = "active" | "on_leave" | "discharged";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

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
  scheduled_at: string;
  status: AppointmentStatus;
  created_at: string;
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
  agents: AgentRecord[];
  appointments: AppointmentRecord[];
  ailments: Array<AilmentRecord & { agent_count: number }>;
}
