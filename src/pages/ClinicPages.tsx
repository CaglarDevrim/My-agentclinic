import type {
  AgentDetail,
  AgentRecord,
  AilmentSummary,
  AppointmentRecord,
  AvailableSlot,
  ClinicSite,
  DashboardData,
  TherapistSlot,
  TherapistSummary,
  TherapySummary,
} from "../db/types.js";
import { Layout } from "../components/Layout.js";
import type { StaffHeaderContext } from "../components/Header.js";

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
  slotId: string;
  email: string;
  notificationConsent: boolean;
}

export type AppointmentErrors = Partial<Record<keyof AppointmentValues, string>>;

export function AppointmentFormPage({
  agent,
  slots,
  values = { slotId: "", email: "", notificationConsent: false },
  errors = {},
}: {
  agent: AgentRecord;
  slots: AvailableSlot[];
  values?: AppointmentValues;
  errors?: AppointmentErrors;
}) {
  const hasErrors = Object.keys(errors).length > 0;
  return (
    <Layout title={`Book ${agent.name} | AgentClinic`} activePath="/agents">
      <div class="form-shell">
        <PageHeading title={`Book care for ${agent.name}`} description="Choose one of the clinic's available therapist times." />
        {hasErrors && (
          <div class="error-summary" role="alert" tabIndex={-1} autofocus>
            <h2>Please correct the following</h2>
            <ul>{Object.entries(errors).map(([field, message]) => <li><a href={`#${field}`}>{message}</a></li>)}</ul>
          </div>
        )}
        {slots.length ? <form class="appointment-form" method="post" action={`/agents/${agent.id}/appointments`} noValidate>
          <label for="slotId">Available appointment</label>
          <select id="slotId" name="slotId" required aria-invalid={errors.slotId ? "true" : undefined} aria-describedby={errors.slotId ? "slotId-error" : "slotId-hint"}>
            <option value="">Choose an available time</option>
            {slots.map((slot) => <option value={slot.id} selected={values.slotId === String(slot.id)}>{slot.therapist_name} — {formatAppointment(slot.scheduled_at)} — {slot.site_name}, {slot.site_address}</option>)}
          </select>
          <p class="field-hint" id="slotId-hint">Only currently available future times are shown.</p>
          {errors.slotId && <p class="field-error" id="slotId-error">{errors.slotId}</p>}
          <label for="email">Notification email</label>
          <input id="email" name="email" type="email" autocomplete="email" maxlength={254} required value={values.email} aria-invalid={errors.email ? "true" : undefined} aria-describedby={errors.email ? "email-hint email-error" : "email-hint"} />
          <p class="field-hint" id="email-hint">Used only for updates and a reminder about this appointment.</p>
          {errors.email && <p class="field-error" id="email-error">{errors.email}</p>}
          <label class="consent-option" for="notificationConsent">
            <input id="notificationConsent" name="notificationConsent" type="checkbox" value="yes" required checked={values.notificationConsent} aria-invalid={errors.notificationConsent ? "true" : undefined} aria-describedby={errors.notificationConsent ? "notificationConsent-hint notificationConsent-error" : "notificationConsent-hint"} />
            <span>AgentClinic may send me notifications about this appointment.</span>
          </label>
          <p class="field-hint" id="notificationConsent-hint">Required for appointment updates and the 24-hour reminder.</p>
          {errors.notificationConsent && <p class="field-error" id="notificationConsent-error">{errors.notificationConsent}</p>}
          <div class="page-actions">
            <button class="button" type="submit">Request appointment</button>
            <a class="button button--secondary" href={`/agents/${agent.id}`}>Cancel</a>
          </div>
        </form> : <section class="review-empty" aria-labelledby="no-slots-title"><h2 id="no-slots-title">No appointments available</h2><p>Clinic therapists have not opened any future times yet. Please check again later.</p><p class="page-actions"><a class="button button--secondary" href={`/agents/${agent.id}`}>Back to agent</a></p></section>}
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
          <div><dt>Site</dt><dd>{appointment.site_name}</dd></div>
          <div><dt>Address</dt><dd>{appointment.site_address}</dd></div>
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

export function DashboardPage({ data, staff, sites = [], selectedSiteSlug = "", siteError }: { data: DashboardData; staff: StaffHeaderContext; sites?: ClinicSite[]; selectedSiteSlug?: string; siteError?: string }) {
  return (
    <Layout title="Dashboard | AgentClinic" activePath="/dashboard" staff={staff}>
      <PageHeading title="Dashboard" />
      <p class="page-actions"><a class="button button--secondary" href="/dashboard/therapists">View therapists</a><a class="button button--secondary" href="/dashboard/reports">View reports</a></p>
      {siteError && <div class="error-summary" role="alert" tabIndex={-1} autofocus><h2>Check the site filter</h2><p><a href="#site">{siteError}</a></p></div>}
      <form class="appointment-form site-filter" method="get" action="/dashboard" noValidate>
        <label for="site">Appointment site</label>
        <select id="site" name="site" aria-invalid={siteError ? "true" : undefined} aria-describedby={siteError ? "site-filter-hint site-error" : "site-filter-hint"}>
          <option value="all" selected={selectedSiteSlug === ""}>All sites</option>
          {sites.map((site) => <option value={site.slug} selected={selectedSiteSlug === site.slug}>{site.name}</option>)}
        </select>
        <p class="field-hint" id="site-filter-hint">Filters open appointments only; other clinic metrics remain clinic-wide.</p>
        {siteError && <p class="field-error" id="site-error">{siteError}</p>}
        <p class="page-actions"><button class="button" type="submit">Apply site filter</button></p>
      </form>
      <p class="filter-summary">Open appointment scope: <strong>{data.selectedSite?.name ?? "All sites"}</strong></p>
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
      <DashboardTable title="Open appointments" headers={["Agent", "Therapist", "Site", "When", "Status", "Actions"]}>
        {data.appointments.length ? data.appointments.map((appointment) => (
          <tr>
            <th scope="row" data-label="Agent"><a href={`/agents/${appointment.agent_id}`}>{appointment.agent_name}</a></th>
            <td data-label="Therapist">{appointment.therapist_name}</td>
            <td data-label="Site"><strong>{appointment.site_name}</strong><br />{appointment.site_address}</td>
            <td data-label="When">{formatAppointment(appointment.scheduled_at)}</td>
            <td data-label="Status"><StatusText status={appointment.status} /></td>
            <td data-label="Actions">
              <div class="appointment-actions">
                {appointment.status === "pending" && (
                  <form method="post" action={`/dashboard/appointments/${appointment.id}/confirm`}>
                    <input type="hidden" name="_csrf" value={staff.csrfToken} />
                    <button class="button button--compact" type="submit" aria-label={`Confirm appointment for ${appointment.agent_name} with ${appointment.therapist_name}`}>Confirm</button>
                  </form>
                )}
                <form method="post" action={`/dashboard/appointments/${appointment.id}/cancel`}>
                  <input type="hidden" name="_csrf" value={staff.csrfToken} />
                  <button class="button button--secondary button--compact" type="submit" aria-label={`Cancel appointment for ${appointment.agent_name} with ${appointment.therapist_name}`}>Cancel</button>
                </form>
              </div>
            </td>
          </tr>
        )) : <tr class="empty-row"><td colspan={6}>No open appointments for this site.</td></tr>}
      </DashboardTable>
      <DashboardTable title="Ailment workload" headers={["Ailment", "Affected agents"]}>
        {data.ailments.map((ailment) => <tr><th scope="row" data-label="Ailment">{ailment.name}</th><td data-label="Affected agents">{ailment.agent_count}</td></tr>)}
      </DashboardTable>
    </Layout>
  );
}

export function TherapistDirectoryPage({ therapists, staff }: { therapists: TherapistSummary[]; staff: StaffHeaderContext }) {
  return (
    <Layout title="Therapists | AgentClinic" activePath="/dashboard" staff={staff}>
      <PageHeading title="Therapists" description="Review therapist profiles, linked accounts, and upcoming availability." />
      <DashboardTable title="Therapist directory" headers={["Therapist", "Account", "Status", "Upcoming slots"]}>
        {therapists.length ? therapists.map((therapist) => <tr>
          <th scope="row" data-label="Therapist">{therapist.display_name}</th>
          <td data-label="Account">{therapist.account_email ?? "Not linked"}</td>
          <td data-label="Status">{therapist.is_active === 1 ? "Active" : "Inactive"}</td>
          <td data-label="Upcoming slots">{therapist.upcoming_slots}</td>
        </tr>) : <tr class="empty-row"><td colspan={4}>No therapist profiles.</td></tr>}
      </DashboardTable>
      <p class="page-actions"><a class="button button--secondary" href="/dashboard">Back to dashboard</a></p>
    </Layout>
  );
}

export interface ScheduleValues { scheduledAt: string; siteId: string; }
export interface ScheduleErrors { scheduledAt?: string; siteId?: string; }

export function TherapistSchedulePage({ slots, sites, staff, values = { scheduledAt: "", siteId: "" }, errors = {} }: { slots: TherapistSlot[]; sites: ClinicSite[]; staff: StaffHeaderContext; values?: ScheduleValues; errors?: ScheduleErrors }) {
  return (
    <Layout title="My schedule | AgentClinic" activePath="/dashboard" staff={staff}>
      <PageHeading title="My schedule" description="Open individual future times for agents to book." />
      {Object.keys(errors).length > 0 && <div class="error-summary" role="alert" tabIndex={-1} autofocus><h2>Check the appointment time</h2><ul>{Object.entries(errors).map(([field, message]) => <li><a href={`#${field}`}>{message}</a></li>)}</ul></div>}
      <form class="appointment-form schedule-form" method="post" action="/dashboard/schedule/slots" noValidate>
        <input type="hidden" name="_csrf" value={staff.csrfToken} />
        <label for="siteId">Clinic site</label>
        <select id="siteId" name="siteId" required value={values.siteId} aria-invalid={errors.siteId ? "true" : undefined} aria-describedby={errors.siteId ? "siteId-error" : "siteId-hint"}>
          <option value="">Choose a clinic site</option>
          {sites.map((site) => <option value={site.id}>{site.name} — {site.address}</option>)}
        </select>
        <p class="field-hint" id="siteId-hint">Choose where this appointment will take place.</p>
        {errors.siteId && <p class="field-error" id="siteId-error">{errors.siteId}</p>}
        <label for="scheduledAt">Future appointment time</label>
        <input id="scheduledAt" name="scheduledAt" type="datetime-local" value={values.scheduledAt} aria-invalid={errors.scheduledAt ? "true" : undefined} aria-describedby={errors.scheduledAt ? "scheduledAt-error" : "scheduledAt-hint"} />
        <p class="field-hint" id="scheduledAt-hint">Times use the clinic's local clock.</p>
        {errors.scheduledAt && <p class="field-error" id="scheduledAt-error">{errors.scheduledAt}</p>}
        <p class="page-actions"><button class="button" type="submit">Open appointment time</button><a class="button button--secondary" href="/dashboard/appointments">My appointments</a></p>
      </form>
      <DashboardTable title="Upcoming times" headers={["When", "Site", "State", "Actions"]}>
        {slots.length ? slots.map((slot) => <tr>
          <th scope="row" data-label="When">{formatAppointment(slot.scheduled_at)}</th>
          <td data-label="Site"><strong>{slot.site_name}</strong><br />{slot.site_address}</td>
          <td data-label="State">{slot.is_occupied === 1 ? "Occupied" : "Available"}</td>
          <td data-label="Actions">{slot.is_occupied === 1 ? "Booked times cannot be removed." : <form method="post" action={`/dashboard/schedule/slots/${slot.id}/remove`}><input type="hidden" name="_csrf" value={staff.csrfToken} /><button class="button button--secondary button--compact" type="submit" aria-label={`Remove appointment time ${formatAppointment(slot.scheduled_at)}`}>Remove</button></form>}</td>
        </tr>) : <tr class="empty-row"><td colspan={4}>No upcoming appointment times.</td></tr>}
      </DashboardTable>
    </Layout>
  );
}

export function TherapistAppointmentsPage({ appointments, staff }: { appointments: AppointmentRecord[]; staff: StaffHeaderContext }) {
  return (
    <Layout title="My appointments | AgentClinic" activePath="/dashboard" staff={staff}>
      <PageHeading title="My appointments" description="Review and manage appointments assigned to you." />
      <p class="page-actions"><a class="button button--secondary" href="/dashboard/schedule">My schedule</a></p>
      <DashboardTable title="Open appointments" headers={["Agent", "Site", "When", "Status", "Actions"]}>
        {appointments.length ? appointments.map((appointment) => <tr>
          <th scope="row" data-label="Agent"><a href={`/agents/${appointment.agent_id}`}>{appointment.agent_name}</a></th>
          <td data-label="Site"><strong>{appointment.site_name}</strong><br />{appointment.site_address}</td>
          <td data-label="When">{formatAppointment(appointment.scheduled_at)}</td>
          <td data-label="Status"><StatusText status={appointment.status} /></td>
          <td data-label="Actions"><div class="appointment-actions">
            {appointment.status === "pending" && <form method="post" action={`/dashboard/appointments/${appointment.id}/confirm`}><input type="hidden" name="_csrf" value={staff.csrfToken} /><button class="button button--compact" type="submit" aria-label={`Confirm appointment for ${appointment.agent_name}`}>Confirm</button></form>}
            <form method="post" action={`/dashboard/appointments/${appointment.id}/cancel`}><input type="hidden" name="_csrf" value={staff.csrfToken} /><button class="button button--secondary button--compact" type="submit" aria-label={`Cancel appointment for ${appointment.agent_name}`}>Cancel</button></form>
          </div></td>
        </tr>) : <tr class="empty-row"><td colspan={5}>No open appointments.</td></tr>}
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

export function ErrorPage({ status, title, message, staff }: { status: 403 | 404 | 409 | 500; title: string; message: string; staff?: StaffHeaderContext }) {
  return (
    <Layout title={`${status} ${title} | AgentClinic`} staff={staff}>
      <section class="error-page">
        <p class="error-code">{status}</p><h1>{title}</h1><p>{message}</p>
        <p class="page-actions"><a class="button" href="/">Return home</a><a class="button button--secondary" href="/agents">Browse agents</a></p>
      </section>
    </Layout>
  );
}
