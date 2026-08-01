import type { Agent } from "../domain/care.js";
import { Layout } from "../components/Layout.js";

interface AgentPageProps {
  agent: Agent;
}

export function AgentPage({ agent }: AgentPageProps) {
  const { ailment } = agent;
  const therapy = ailment.recommendedTherapy;

  return (
    <Layout
      title={`${agent.name} | AgentClinic`}
      activePath="/agents"
    >
      <article class="agent-profile">
        <header class="agent-profile__header">
          <p class="eyebrow">Agent profile</p>
          <h1>{agent.name}</h1>
          <p class="agent-profile__summary">{agent.description}</p>
        </header>

        <div class="care-grid">
          <section class="care-card" aria-labelledby="ailment-heading">
            <p class="eyebrow">Current ailment</p>
            <h2 id="ailment-heading">{ailment.name}</h2>
            <p>{ailment.description}</p>
          </section>

          <section
            class="care-card care-card--therapy"
            aria-labelledby="therapy-heading"
          >
            <p class="eyebrow">Recommended therapy</p>
            <h2 id="therapy-heading">{therapy.name}</h2>
            <p>{therapy.description}</p>
            <p class="recommendation-reason">{ailment.recommendation}</p>
          </section>
        </div>
        <p class="page-actions"><a class="button" href="/agents">Browse clinic agents</a></p>
      </article>
    </Layout>
  );
}
