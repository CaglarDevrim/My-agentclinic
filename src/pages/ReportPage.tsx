import type { StaffHeaderContext } from "../components/Header.js";
import { Layout } from "../components/Layout.js";
import type { ClinicReport, ClinicSite } from "../db/types.js";
import type { ReportFilterErrors, ReportFilterValues } from "../domain/reporting.js";

export function ClinicReportPage({ report, values, errors = {}, staff, sites, selectedSiteSlug = "", siteError }: {
  report?: ClinicReport;
  values: ReportFilterValues;
  errors?: ReportFilterErrors;
  staff: StaffHeaderContext;
  sites: ClinicSite[];
  selectedSiteSlug?: string;
  siteError?: string;
}) {
  const hasErrors = Object.keys(errors).length > 0 || Boolean(siteError);
  const csvHref = report ? `/dashboard/reports.csv?from=${encodeURIComponent(report.range.from)}&to=${encodeURIComponent(report.range.to)}${selectedSiteSlug ? `&site=${encodeURIComponent(selectedSiteSlug)}` : ""}` : undefined;
  return (
    <Layout title="Reports | AgentClinic" activePath="/dashboard/reports" staff={staff}>
      <header class="page-heading">
        <h1>Clinic reports</h1>
        <p>Review appointment activity by scheduled date.</p>
      </header>
      {hasErrors && (
        <div class="error-summary" role="alert" tabIndex={-1} autofocus>
          <h2>Check the report period</h2>
          <ul>{Object.entries(errors).map(([field, message]) => <li><a href={`#${field}`}>{message}</a></li>)}{siteError && <li><a href="#site">{siteError}</a></li>}</ul>
        </div>
      )}
      <form class="appointment-form report-filters" method="get" action="/dashboard/reports" noValidate>
        <label for="from">From date</label>
        <input id="from" name="from" type="date" required value={values.from} aria-invalid={errors.from ? "true" : undefined} aria-describedby={errors.from ? "report-range-hint from-error" : "report-range-hint"} />
        {errors.from && <p class="field-error" id="from-error">{errors.from}</p>}
        <label for="to">To date</label>
        <input id="to" name="to" type="date" required value={values.to} aria-invalid={errors.to ? "true" : undefined} aria-describedby={errors.to ? "report-range-hint to-error" : "report-range-hint"} />
        {errors.to && <p class="field-error" id="to-error">{errors.to}</p>}
        <label for="site">Clinic site</label>
        <select id="site" name="site" aria-invalid={siteError ? "true" : undefined} aria-describedby={siteError ? "report-site-hint site-error" : "report-site-hint"}>
          <option value="all" selected={selectedSiteSlug === ""}>All sites</option>
          {sites.map((site) => <option value={site.slug} selected={selectedSiteSlug === site.slug}>{site.name}</option>)}
        </select>
        <p class="field-hint" id="report-site-hint">Choose one site or include the whole clinic.</p>
        {siteError && <p class="field-error" id="site-error">{siteError}</p>}
        <p class="field-hint" id="report-range-hint">Scheduled dates are inclusive and use the clinic's local calendar. Maximum 366 days.</p>
        <p class="page-actions report-actions">
          <button class="button" type="submit">Apply filters</button>
          {csvHref && <a class="button button--secondary" href={csvHref} download>Download CSV</a>}
          <a class="button button--secondary" href="/dashboard">Back to dashboard</a>
        </p>
      </form>
      {report && (
        <section class="report-results" aria-labelledby="report-period">
          <h2 id="report-period">Report period: {report.range.from} to {report.range.to} — {report.selectedSite?.name ?? "All sites"}</h2>
          <dl class="metrics report-metrics">
            <div><dt>Total appointments</dt><dd>{report.totals.total}</dd></div>
            <div><dt>Pending</dt><dd>{report.totals.pending}</dd></div>
            <div><dt>Confirmed</dt><dd>{report.totals.confirmed}</dd></div>
            <div><dt>Cancelled</dt><dd>{report.totals.cancelled}</dd></div>
          </dl>
          <ReportTable title="Therapist workload" headers={["Therapist", "Total", "Pending", "Confirmed", "Cancelled"]} empty="No therapist workload in this period.">
            {report.therapistWorkload.map((row) => <tr>
              <th scope="row" data-label="Therapist">{row.therapist_name}</th>
              <td data-label="Total">{row.total}</td>
              <td data-label="Pending">{row.pending}</td>
              <td data-label="Confirmed">{row.confirmed}</td>
              <td data-label="Cancelled">{row.cancelled}</td>
            </tr>)}
          </ReportTable>
          <ReportTable title="Agent demand" headers={["Agent", "Appointments"]} empty="No agent demand in this period.">
            {report.agentDemand.map((row) => <tr>
              <th scope="row" data-label="Agent"><a href={`/agents/${row.agent_id}`}>{row.agent_name}</a></th>
              <td data-label="Appointments">{row.total}</td>
            </tr>)}
          </ReportTable>
        </section>
      )}
    </Layout>
  );
}

function ReportTable({ title, headers, empty, children }: { title: string; headers: string[]; empty: string; children: unknown[] }) {
  return (
    <section class="dashboard-section">
      <h3>{title}</h3>
      <div class="table-wrap"><table><thead><tr>{headers.map((header) => <th scope="col">{header}</th>)}</tr></thead><tbody>
        {children.length ? children as never : <tr class="empty-row"><td colspan={headers.length}>{empty}</td></tr>}
      </tbody></table></div>
    </section>
  );
}
