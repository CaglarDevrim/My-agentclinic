import type { AgentDetail, AgentRecord, AilmentSummary, AppointmentRecord, DashboardData, TherapySummary } from "../db/types.js";
import { Layout } from "../components/Layout.js";

const statusLabels = { active: "Active", on_leave: "On leave", discharged: "Discharged", pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled" } as const;

function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  return <span class={`status status--${status}`}>{statusLabels[status]}</span>;
}

function formatAppointment(value: string): string {
  const [date, time = ""] = value.split("T");
  return `${date} at ${time}`;
}

export function AgentsPage({ agents }: { agents: AgentRecord[] }) {
  return <Layout title="Agents | AgentClinic" activePath="/agents">
    <header class="page-heading"><p class="eyebrow">Clinic directory</p><h1>Agents</h1><p>Meet the agents currently receiving care at AgentClinic.</p></header>
    <div class="catalog-grid">{agents.map((agent) => <article class="catalog-card"><div class="catalog-card__top"><h2><a href={`/agents/${agent.id}`}>{agent.name}</a></h2><StatusBadge status={agent.status}/></div><p class="meta">{agent.model}</p><p>{agent.description}</p><a class="text-link" href={`/agents/${agent.id}`}>View care plan <span aria-hidden="true">→</span></a></article>)}</div>
  </Layout>;
}

export function AgentDetailPage({ agent }: { agent: AgentDetail }) {
  return <Layout title={`${agent.name} | AgentClinic`} activePath="/agents">
    <article class="detail-page"><header class="page-heading"><p class="eyebrow">Agent profile</p><h1>{agent.name}</h1><div class="identity"><span>{agent.model}</span><StatusBadge status={agent.status}/></div><p>{agent.description}</p></header>
      <div class="care-grid"><section class="care-card"><p class="eyebrow">Current ailments</p><h2>Care concerns</h2>{agent.ailments.length ? <ul class="detail-list">{agent.ailments.map((ailment) => <li><strong>{ailment.name}</strong><span>{ailment.description}</span></li>)}</ul> : <p>No active ailments recorded.</p>}</section>
      <section class="care-card care-card--therapy"><p class="eyebrow">Recommended therapies</p><h2>Treatment plan</h2>{agent.therapies.length ? <ul class="detail-list">{agent.therapies.map((therapy) => <li><strong>{therapy.name}</strong><span>{therapy.description}</span></li>)}</ul> : <p>No therapies recommended.</p>}</section></div>
      <p class="page-actions"><a class="button" href={`/agents/${agent.id}/appointments/new`}>Book an appointment</a><a class="button button--secondary" href="/agents">Back to agents</a></p>
    </article>
  </Layout>;
}

export function AilmentsPage({ ailments }: { ailments: AilmentSummary[] }) {
  return <Layout title="Ailments | AgentClinic" activePath="/ailments"><header class="page-heading"><p class="eyebrow">Conditions we treat</p><h1>Ailments</h1><p>Common challenges agents bring to the clinic and the care we recommend.</p></header><div class="catalog-grid">{ailments.map((ailment) => <article class="catalog-card"><div class="catalog-card__top"><h2>{ailment.name}</h2><span class="count-chip">{ailment.agent_count} agent{ailment.agent_count === 1 ? "" : "s"}</span></div><p>{ailment.description}</p><h3>Recommended therapies</h3><ul class="tag-list">{ailment.therapies.map((therapy) => <li>{therapy.name}</li>)}</ul><p class="meta">In care: {ailment.agents.join(", ") || "None"}</p></article>)}</div></Layout>;
}

export function TherapiesPage({ therapies }: { therapies: TherapySummary[] }) {
  return <Layout title="Therapies | AgentClinic" activePath="/therapies"><header class="page-heading"><p class="eyebrow">Treatment library</p><h1>Therapies</h1><p>Supportive, evidence-minded treatments designed for AI wellbeing.</p></header><div class="catalog-grid">{therapies.map((therapy) => <article class="catalog-card"><h2>{therapy.name}</h2><p>{therapy.description}</p><h3>Recommended for</h3><ul class="tag-list">{therapy.ailments.map((ailment) => <li>{ailment.name}</li>)}</ul></article>)}</div></Layout>;
}

export interface AppointmentValues { therapistName: string; date: string; time: string; }
export type AppointmentErrors = Partial<Record<keyof AppointmentValues, string>>;

export function AppointmentFormPage({ agent, values = { therapistName: "", date: "", time: "" }, errors = {} }: { agent: AgentRecord; values?: AppointmentValues; errors?: AppointmentErrors }) {
  const hasErrors = Object.keys(errors).length > 0;
  return <Layout title={`Book ${agent.name} | AgentClinic`} activePath="/agents"><div class="form-shell"><header class="page-heading"><p class="eyebrow">Appointment request</p><h1>Book care for {agent.name}</h1><p>Choose a therapist and a future appointment time.</p></header>{hasErrors && <div class="error-summary" role="alert"><h2>Please correct the following</h2><ul>{Object.entries(errors).map(([field, message]) => <li><a href={`#${field}`}>{message}</a></li>)}</ul></div>}<form class="appointment-form" method="post" action={`/agents/${agent.id}/appointments`} noValidate><label for="therapistName">Therapist name</label><input id="therapistName" name="therapistName" value={values.therapistName} aria-invalid={errors.therapistName ? "true" : undefined} aria-describedby={errors.therapistName ? "therapistName-error" : undefined}/>{errors.therapistName && <p class="field-error" id="therapistName-error">{errors.therapistName}</p>}<label for="date">Date</label><input id="date" name="date" type="date" value={values.date} aria-invalid={errors.date ? "true" : undefined} aria-describedby={errors.date ? "date-error" : undefined}/>{errors.date && <p class="field-error" id="date-error">{errors.date}</p>}<label for="time">Time</label><input id="time" name="time" type="time" value={values.time} aria-invalid={errors.time ? "true" : undefined} aria-describedby={errors.time ? "time-error" : undefined}/>{errors.time && <p class="field-error" id="time-error">{errors.time}</p>}<div class="page-actions"><button class="button" type="submit">Request appointment</button><a class="button button--secondary" href={`/agents/${agent.id}`}>Cancel</a></div></form></div></Layout>;
}

export function AppointmentConfirmationPage({ appointment }: { appointment: AppointmentRecord }) {
  return <Layout title="Appointment confirmed | AgentClinic" activePath="/agents"><article class="confirmation"><p class="confirmation__mark" aria-hidden="true">✓</p><p class="eyebrow">Request received</p><h1>Appointment requested</h1><p>AgentClinic has saved the following care appointment.</p><dl class="appointment-details"><div><dt>Agent</dt><dd>{appointment.agent_name}</dd></div><div><dt>Therapist</dt><dd>{appointment.therapist_name}</dd></div><div><dt>When</dt><dd>{formatAppointment(appointment.scheduled_at)}</dd></div><div><dt>Status</dt><dd><StatusBadge status={appointment.status}/></dd></div></dl><p class="page-actions"><a class="button" href="/dashboard">View dashboard</a><a class="button button--secondary" href={`/agents/${appointment.agent_id}`}>Back to agent</a></p></article></Layout>;
}

export function DashboardPage({ data }: { data: DashboardData }) {
  return <Layout title="Dashboard | AgentClinic" activePath="/dashboard"><header class="page-heading"><p class="eyebrow">Clinic overview</p><h1>Dashboard</h1><p>A live view of agents, appointments, and care workload.</p></header><div class="metrics"><article><strong>{data.totalAgents}</strong><span>Total agents</span></article><article><strong>{data.openAppointments}</strong><span>Open appointments</span></article><article><strong>{data.activeAilments}</strong><span>Active ailments</span></article></div><DashboardTable title="Agent status" headers={["Agent", "Model", "Status"]}>{data.agents.map((agent) => <tr><th scope="row"><a href={`/agents/${agent.id}`}>{agent.name}</a></th><td>{agent.model}</td><td><StatusBadge status={agent.status}/></td></tr>)}</DashboardTable><DashboardTable title="Open appointments" headers={["Agent", "Therapist", "When", "Status"]}>{data.appointments.length ? data.appointments.map((appointment) => <tr><th scope="row"><a href={`/agents/${appointment.agent_id}`}>{appointment.agent_name}</a></th><td>{appointment.therapist_name}</td><td>{formatAppointment(appointment.scheduled_at)}</td><td><StatusBadge status={appointment.status}/></td></tr>) : <tr><td colspan={4}>No open appointments.</td></tr>}</DashboardTable><DashboardTable title="Ailment workload" headers={["Ailment", "Affected agents"]}>{data.ailments.map((ailment) => <tr><th scope="row">{ailment.name}</th><td>{ailment.agent_count}</td></tr>)}</DashboardTable></Layout>;
}

function DashboardTable({ title, headers, children }: { title: string; headers: string[]; children: unknown }) {
  return <section class="dashboard-section"><h2>{title}</h2><div class="table-wrap"><table><thead><tr>{headers.map((header) => <th scope="col">{header}</th>)}</tr></thead><tbody>{children as never}</tbody></table></div></section>;
}

export function ErrorPage({ status, title, message }: { status: 404 | 500; title: string; message: string }) {
  return <Layout title={`${status} ${title} | AgentClinic`}><section class="error-page"><p class="error-code">{status}</p><h1>{title}</h1><p>{message}</p><p class="page-actions"><a class="button" href="/">Return home</a><a class="button button--secondary" href="/agents">Browse agents</a></p></section></Layout>;
}
