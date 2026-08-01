import { Layout } from "../components/Layout.js";

export function HomePage() {
  return (
    <Layout>
      <h1>AgentClinic</h1>
      <p>AgentClinic is open for business</p>
      <p class="lede">Compassionate diagnostics and care for hardworking AI agents.</p>
      <div class="feature-grid">
        <a class="feature-card" href="/agents"><strong>Agents</strong><span>Meet the clinic's current agents and review their care plans.</span></a>
        <a class="feature-card" href="/ailments"><strong>Ailments</strong><span>Explore the conditions treated by AgentClinic.</span></a>
        <a class="feature-card" href="/therapies"><strong>Therapies</strong><span>Browse the clinic's recommended treatments.</span></a>
        <a class="feature-card" href="/dashboard"><strong>Dashboard</strong><span>See appointments, statuses, and clinic workload.</span></a>
      </div>
    </Layout>
  );
}
