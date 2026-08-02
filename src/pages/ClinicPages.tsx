import type {
  AgentDetail,
  AgentRecord,
  AilmentSummary,
  AppointmentRecord,
  DashboardData,
  TherapySummary,
} from "../db/types.js";
import { Layout } from "../components/Layout.js";

const statusLabels = {
  active: "active",
  on_leave: "on leave",
  discharged: "discharged",
  pending: "pending",
  confirmed: "confirmed",
  cancelled: "cancelled",
} as const;

function StatusText({ status }: { status: keyof typeof statusLabels }) {
  return <span class={`status status--${status}`}>{statusLabels[status]}</span>;
}

function formatAppointment(value: string): string {
  const [date, time = ""] = value.split("T");
  return `${date} at ${time}`;
}

function PageHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header class="page-heading">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}

export function AgentsPage({ agents }: { agents: AgentRecord[] }) {
  return (
    <Layout title="Agents | AgentClinic" activePath="/agents">
      <PageHeading title="Agents" />
      <div class="table-wrap catalog-table-wrap">
        <table class="catalog-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Model</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr>
                <th scope="row" data-label="Name">
                  <a href={`/agents/${agent.id}`}>{agent.name}</a>
                </th>
                <td data-label="Model">{agent.model}</td>
                <td data-label="Status"><StatusText status={agent.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export function AgentDetailPage({ agent }: { agent: AgentDetail }) {
  return (
    <Layout title={`${agent.name} | AgentClinic`} activePath="/agents">
      <article class="detail-page">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="/agents">Agents</a><span aria-hidden="true">/</span><span>{agent.name}</span>
        </nav>
        <header class="detail-heading">
          <div>
            <h1>{agent.name}</h1>
            <p>{agent.description}</p>
          </div>
          <dl class="identity">
            <div><dt>Model</dt><dd>{agent.model}</dd></div>
            <div><dt>Status</dt><dd><StatusText status={agent.status} /></dd></div>
          </dl>
        </header>

        <div class="detail-grid">
          <section class="detail-panel">
            <h2>Current ailments</h2>
            {agent.ailments.length ? (
              <ul class="detail-list">
                {agent.ailments.map((ailment) => (
                  <li><strong>{ailment.name}</strong><span>{ailment.description}</span></li>
                ))}
              </ul>
            ) : <p>No active ailments recorded.</p>}
          </section>
          <section class="detail-panel">
            <h2>Recommended therapies</h2>
            {agent.therapies.length ? (
              <ul class="detail-list">
                {agent.therapies.map((therapy) => (
                  <li><strong>{therapy.name}</strong><span>{therapy.description}</span></li>
                ))}
              </ul>
            ) : <p>No therapies recommended.</p>}
          </section>
        </div>

        <p class="page-actions">
          <a class="button" href={`/agents/${agent.id}/appointments/new`}>Book an appointment</a>
          <a class="button button--secondary" href="/agents">Back to agents</a>
        </p>
      </article>
    </Layout>
  );
}

export function AilmentsPage({ ailments }: { ailments: AilmentSummary[] }) {
  return (
    <Layout title="Ailments | AgentClinic" activePath="/ailments">
      <PageHeading title="Ailments" />
      <div class="table-wrap catalog-table-wrap">
        <table class="catalog-table catalog-table--descriptions catalog-table--ailments">
          <thead><tr><th scope="col">Name</th><th scope="col">Description</th></tr></thead>
          <tbody>
            {ailments.map((ailment) => (
              <tr>
                <th scope="row" data-label="Name">{ailment.name}</th>
                <td data-label="Description">{ailment.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export function TherapiesPage({ therapies }: { therapies: TherapySummary[] }) {
  return (
    <Layout title="Therapies | AgentClinic" activePath="/therapies">
      <PageHeading title="Therapies" />
      <div class="table-wrap catalog-table-wrap">
        <table class="catalog-table catalog-table--descriptions">
          <thead><tr><th scope="col">Name</th><th scope="col">Description</th></tr></thead>
          <tbody>
            {therapies.map((therapy) => (
              <tr>
                <th scope="row" data-label="Name">{therapy.name}</th>
                <td data-label="Description">{therapy.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export interface AppointmentValues {
  therapistName: string;
  date: string;
  time: string;
}

export type AppointmentErrors = Partial<Record<keyof AppointmentValues, string>>;

export function AppointmentFormPage({
  agent,
  values = { therapistName: "", date: "", time: "" },
  errors = {},
}: {
  agent: AgentRecord;
  values?: AppointmentValues;
  errors?: AppointmentErrors;
}) {
  const hasErrors = Object.keys(errors).length > 0;
  return (
    <Layout title={`Book ${agent.name} | AgentClinic`} activePath="/agents">
      <div class="form-shell">
        <PageHeading title={`Book care for ${agent.name}`} description="Choose a therapist and a future appointment time." />
        {hasErrors && (
          <div class="error-summary" role="alert" tabIndex={-1} autofocus>
            <h2>Please correct the following</h2>
            <ul>{Object.entries(errors).map(([field, message]) => <li><a href={`#${field}`}>{message}</a></li>)}</ul>
          </div>
        )}
        <form class="appointment-form" method="post" action={`/agents/${agent.id}/appointments`} noValidate>
          <label for="therapistName">Therapist name</label>
          <input id="therapistName" name="therapistName" value={values.therapistName} aria-invalid={errors.therapistName ? "true" : undefined} aria-describedby={errors.therapistName ? "therapistName-error" : undefined} />
          {errors.therapistName && <p class="field-error" id="therapistName-error">{errors.therapistName}</p>}
          <label for="date">Date</label>
          <input id="date" name="date" type="date" value={values.date} aria-invalid={errors.date ? "true" : undefined} aria-describedby={errors.date ? "date-error" : undefined} />
          {errors.date && <p class="field-error" id="date-error">{errors.date}</p>}
          <label for="time">Time</label>
          <input id="time" name="time" type="time" value={values.time} aria-invalid={errors.time ? "true" : undefined} aria-describedby={errors.time ? "time-error" : undefined} />
          {errors.time && <p class="field-error" id="time-error">{errors.time}</p>}
          <div class="page-actions">
            <button class="button" type="submit">Request appointment</button>
            <a class="button button--secondary" href={`/agents/${agent.id}`}>Cancel</a>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export function AppointmentConfirmationPage({ appointment }: { appointment: AppointmentRecord }) {
  return (
    <Layout title="Appointment confirmed | AgentClinic" activePath="/agents">
      <article class="confirmation">
        <p class="confirmation__mark" aria-hidden="true">✓</p>
        <h1>Appointment requested</h1>
        <p>AgentClinic has saved the following care appointment.</p>
        <dl class="appointment-details">
          <div><dt>Agent</dt><dd>{appointment.agent_name}</dd></div>
          <div><dt>Therapist</dt><dd>{appointment.therapist_name}</dd></div>
          <div><dt>When</dt><dd>{formatAppointment(appointment.scheduled_at)}</dd></div>
          <div><dt>Status</dt><dd><StatusText status={appointment.status} /></dd></div>
        </dl>
        <p class="page-actions">
          <a class="button" href="/dashboard">View dashboard</a>
          <a class="button button--secondary" href={`/agents/${appointment.agent_id}`}>Back to agent</a>
        </p>
      </article>
    </Layout>
  );
}

export function DashboardPage({ data }: { data: DashboardData }) {
  return (
    <Layout title="Dashboard | AgentClinic" activePath="/dashboard">
      <PageHeading title="Dashboard" />
      <dl class="metrics">
        <div><dt>Total agents</dt><dd>{data.totalAgents}</dd></div>
        <div><dt>Open appointments</dt><dd>{data.openAppointments}</dd></div>
        <div><dt>Active ailments</dt><dd>{data.activeAilments}</dd></div>
        <div><dt><a href="/dashboard/reviews">Pending reviews</a></dt><dd>{data.pendingReviews}</dd></div>
      </dl>
      <DashboardTable title="Agent status" headers={["Agent", "Model", "Status"]}>
        {data.agents.map((agent) => (
          <tr><th scope="row" data-label="Agent"><a href={`/agents/${agent.id}`}>{agent.name}</a></th><td data-label="Model">{agent.model}</td><td data-label="Status"><StatusText status={agent.status} /></td></tr>
        ))}
      </DashboardTable>
      <DashboardTable title="Open appointments" headers={["Agent", "Therapist", "When", "Status", "Actions"]}>
        {data.appointments.length ? data.appointments.map((appointment) => (
          <tr>
            <th scope="row" data-label="Agent"><a href={`/agents/${appointment.agent_id}`}>{appointment.agent_name}</a></th>
            <td data-label="Therapist">{appointment.therapist_name}</td>
            <td data-label="When">{formatAppointment(appointment.scheduled_at)}</td>
            <td data-label="Status"><StatusText status={appointment.status} /></td>
            <td data-label="Actions">
              <div class="appointment-actions">
                {appointment.status === "pending" && (
                  <form method="post" action={`/dashboard/appointments/${appointment.id}/confirm`}>
                    <button class="button button--compact" type="submit" aria-label={`Confirm appointment for ${appointment.agent_name} with ${appointment.therapist_name}`}>Confirm</button>
                  </form>
                )}
                <form method="post" action={`/dashboard/appointments/${appointment.id}/cancel`}>
                  <button class="button button--secondary button--compact" type="submit" aria-label={`Cancel appointment for ${appointment.agent_name} with ${appointment.therapist_name}`}>Cancel</button>
                </form>
              </div>
            </td>
          </tr>
        )) : <tr class="empty-row"><td colspan={5}>No open appointments.</td></tr>}
      </DashboardTable>
      <DashboardTable title="Ailment workload" headers={["Ailment", "Affected agents"]}>
        {data.ailments.map((ailment) => <tr><th scope="row" data-label="Ailment">{ailment.name}</th><td data-label="Affected agents">{ailment.agent_count}</td></tr>)}
      </DashboardTable>
    </Layout>
  );
}

function DashboardTable({ title, headers, children }: { title: string; headers: string[]; children: unknown }) {
  return (
    <section class="dashboard-section">
      <h2>{title}</h2>
      <div class="table-wrap"><table><thead><tr>{headers.map((header) => <th scope="col">{header}</th>)}</tr></thead><tbody>{children as never}</tbody></table></div>
    </section>
  );
}

export function ErrorPage({ status, title, message }: { status: 404 | 409 | 500; title: string; message: string }) {
  return (
    <Layout title={`${status} ${title} | AgentClinic`}>
      <section class="error-page">
        <p class="error-code">{status}</p><h1>{title}</h1><p>{message}</p>
        <p class="page-actions"><a class="button" href="/">Return home</a><a class="button button--secondary" href="/agents">Browse agents</a></p>
      </section>
    </Layout>
  );
}
