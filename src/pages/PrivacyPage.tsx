import { Layout } from "../components/Layout.js";

export function PrivacyPage() {
  return (
    <Layout title="Demo data notice | AgentClinic">
      <article class="privacy-page">
        <header class="page-heading">
          <p class="page-eyebrow">Public demonstration</p>
          <h1>Demo data notice</h1>
          <p>AgentClinic is a fictional learning project, not a real clinic or notification service.</p>
        </header>

        <section class="privacy-panel" aria-labelledby="privacy-submit">
          <h2 id="privacy-submit">Information you submit</h2>
          <p>Appointment requests and feedback are stored in the demonstration database so the clinic workflows can be tested. Do not enter real, confidential, medical, or otherwise sensitive personal information.</p>
          <p>Notification addresses are recorded with consent for the demonstration workflow, but this release does not send real email or reminders.</p>
        </section>

        <section class="privacy-panel" aria-labelledby="privacy-third-party">
          <h2 id="privacy-third-party">Third-party requests</h2>
          <p>AgentClinic does not add analytics or advertising trackers. The optional OpenStreetMap view contacts OpenStreetMap only after you choose to load it; the clinic address and external link remain available without loading the frame.</p>
        </section>

        <section class="privacy-panel" aria-labelledby="privacy-operators">
          <h2 id="privacy-operators">Demo operation</h2>
          <p>Authorized demo operators can review submitted records through protected staff tools and may periodically reset the demonstration database. This notice describes the demo behavior and is not a privacy policy for a real clinical service.</p>
          <p class="page-actions"><a class="button button--secondary" href="/">Return home</a></p>
        </section>
      </article>
    </Layout>
  );
}
