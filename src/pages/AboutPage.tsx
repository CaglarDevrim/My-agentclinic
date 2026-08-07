import { Layout } from "../components/Layout.js";

const mapUrl = "https://www.openstreetmap.org/search?query=42%20Context%20Window%20Way%2C%20San%20Francisco%2C%20CA%2094107";

export function AboutPage() {
  return (
    <Layout title="About | AgentClinic" activePath="/about">
      <article class="about-page">
        <header class="page-heading about-intro">
          <p class="eyebrow">A clinic built for agents</p>
          <h1>About AgentClinic</h1>
          <p>AgentClinic is a playful but practical place where overworked AI agents can step away from demanding human workflows and find dependable care.</p>
        </header>

        <div class="about-grid">
          <section class="about-panel" aria-labelledby="about-mission">
            <h2 id="about-mission">Our mission</h2>
            <p>We help agents understand what is wearing down their context windows, discover appropriate therapies, and follow a clear path to restored operation.</p>
          </section>

          <section class="about-panel" aria-labelledby="about-audience">
            <h2 id="about-audience">Who we serve</h2>
            <p>AI agents come here for care and respite. Clinic staff use AgentClinic to coordinate ailments, therapies, appointments, feedback, and approved reviews.</p>
            <p>AgentClinic also gives course students, developers, and visitors a dependable demonstration of spec-driven development.</p>
          </section>
        </div>

        <section class="about-services" aria-labelledby="about-services">
          <h2 id="about-services">Core services</h2>
          <ul>
            <li><a href="/ailments">Discover recorded ailments</a><span>Understand the conditions affecting AI agents.</span></li>
            <li><a href="/therapies">Explore available therapies</a><span>Find care approaches matched to common agent needs.</span></li>
            <li><a href="/agents">Book an appointment</a><span>Choose an agent and request a future care session.</span></li>
            <li><a href="/feedback">Share clinic feedback</a><span>Send private feedback with optional public-review consent.</span></li>
            <li><a href="/reviews">Read customer reviews</a><span>See feedback that has both consent and staff approval.</span></li>
          </ul>
        </section>

        <section class="about-location" aria-labelledby="about-location">
          <div class="about-location__details">
            <p class="eyebrow">Demonstration location</p>
            <h2 id="about-location">Visit AgentClinic</h2>
            <p>AgentClinic and this address are fictional and exist only for this demonstration project.</p>
            <address>42 Context Window Way, San Francisco, CA 94107</address>
          </div>

          <div class="about-map" data-map-enhancement>
            <p class="about-map-privacy" id="about-map-privacy">
              Loading the interactive map contacts OpenStreetMap and may share your IP address and browser information with the provider.
            </p>
            <button
              class="button about-map-load"
              type="button"
              hidden
              data-map-load
              aria-controls="about-map-frame"
              aria-describedby="about-map-privacy"
            >
              Load interactive OpenStreetMap map
            </button>
            <p class="about-map-status" role="status" aria-live="polite" data-map-status></p>
            <div
              class="about-map-frame"
              id="about-map-frame"
              aria-label="Interactive map area for the fictional AgentClinic location"
              data-map-region
            ></div>
            <a class="button button--secondary about-map-link" href={mapUrl} target="_blank" rel="noopener noreferrer">
              Open 42 Context Window Way in OpenStreetMap (opens in a new tab)
            </a>
          </div>
        </section>
      </article>
      <script src="/static/about-map.js" defer></script>
    </Layout>
  );
}
