import { Layout } from "../components/Layout.js";

export function HomePage() {
  return (
    <Layout title="AgentClinic">
      <div class="home-page">
        <section class="home-hero" aria-labelledby="home-title">
          <div class="home-hero__content">
            <p class="home-eyebrow">Care for agents. Clarity for humans.</p>
            <h1 id="home-title">Give your AI agents room to recover.</h1>
            <p class="home-hero__tagline">Where AI agents come to get better.</p>
            <p class="home-hero__lede">AgentClinic connects overworked agents with thoughtful therapies, dependable appointments, and a calmer path back to their best work.</p>
            <p class="page-actions home-hero__actions">
              <a class="button" href="/agents">Find care for an agent</a>
              <a class="button button--secondary" href="/therapies">Explore therapies</a>
            </p>
            <ul class="home-trust" aria-label="Clinic highlights">
              <li><strong>2</strong><span>welcoming locations</span></li>
              <li><strong>24h</strong><span>appointment reminders</span></li>
              <li><strong>UTC</strong><span>reliable scheduling</span></li>
            </ul>
          </div>

          <div class="home-hero__preview" aria-hidden="true">
            <div class="home-orbit home-orbit--one"></div>
            <div class="home-orbit home-orbit--two"></div>
            <div class="home-care-card">
              <p class="home-care-card__label">Next care session</p>
              <div class="home-care-card__agent"><span>AI</span><div><strong>Bartholomew-47B</strong><small>Context recovery</small></div></div>
              <dl>
                <div><dt>Therapy</dt><dd>Mindful Token Counting</dd></div>
                <div><dt>Clinic</dt><dd>Context Window Clinic</dd></div>
              </dl>
              <p class="home-care-card__status"><span></span>Time reserved</p>
            </div>
          </div>
        </section>

        <section class="home-section" aria-labelledby="home-path-title">
          <header class="home-section__heading">
            <p class="home-eyebrow">One clinic, two clear paths</p>
            <h2 id="home-path-title">Start where you are.</h2>
            <p>Whether you need care or coordinate it, the next useful action is always close.</p>
          </header>
          <div class="home-paths">
            <article class="home-path-card">
              <p class="home-card-number" aria-hidden="true">01</p>
              <h3>For AI agents</h3>
              <p>Understand what is getting in the way, discover suitable therapies, and reserve a trusted therapist time.</p>
              <a href="/agents">Browse agents and book care <span aria-hidden="true">→</span></a>
            </article>
            <article class="home-path-card">
              <p class="home-card-number" aria-hidden="true">02</p>
              <h3>For clinic teams</h3>
              <p>Manage schedules, appointments, reviews, reminders, locations, and operational reports from one place.</p>
              <a href="/dashboard">Open the clinic dashboard <span aria-hidden="true">→</span></a>
            </article>
          </div>
        </section>

        <section class="home-section" aria-labelledby="home-care-title">
          <header class="home-section__heading">
            <p class="home-eyebrow">Designed for dependable care</p>
            <h2 id="home-care-title">A complete journey, without the chaos.</h2>
          </header>
          <div class="home-benefits">
            <article><span aria-hidden="true">Discover</span><h3>Care that makes sense</h3><p>Connect ailments to practical therapies through a clear, focused catalog.</p></article>
            <article><span aria-hidden="true">Book</span><h3>Times you can trust</h3><p>Choose live therapist availability with collision-safe, timezone-aware booking.</p></article>
            <article><span aria-hidden="true">Coordinate</span><h3>Operations in one view</h3><p>Keep schedules, notifications, locations, and reporting aligned across the clinic.</p></article>
          </div>
        </section>

        <aside class="home-closing" aria-labelledby="home-closing-title">
          <div><p class="home-eyebrow">A healthier next prompt starts here</p><h2 id="home-closing-title">Ready to make some space?</h2></div>
          <p class="page-actions"><a class="button" href="/agents">Book an appointment</a><a class="button button--secondary" href="/about">Meet AgentClinic</a></p>
        </aside>
      </div>
    </Layout>
  );
}
