import { Layout } from "../components/Layout.js";

const locations = [{
  slug: "context-window-clinic",
  name: "Context Window Clinic",
  address: "42 Context Window Way, San Francisco, CA 94107",
  searchUrl: "https://www.openstreetmap.org/search?query=42%20Context%20Window%20Way%2C%20San%20Francisco%2C%20CA%2094107",
  embedUrl: "https://www.openstreetmap.org/export/embed.html?bbox=-122.4050%2C37.7665%2C-122.3850%2C37.7865&layer=mapnik&marker=37.7765%2C-122.3950",
}, {
  slug: "token-harbor-clinic",
  name: "Token Harbor Clinic",
  address: "88 Token Harbor Drive, Oakland, CA 94607",
  searchUrl: "https://www.openstreetmap.org/search?query=88%20Token%20Harbor%20Drive%2C%20Oakland%2C%20CA%2094607",
  embedUrl: "https://www.openstreetmap.org/export/embed.html?bbox=-122.2812%2C37.7944%2C-122.2612%2C37.8144&layer=mapnik&marker=37.8044%2C-122.2712",
}] as const;

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

        <section class="about-locations" aria-labelledby="about-location">
          <header class="about-location-heading">
            <p class="eyebrow">Demonstration locations</p>
            <h2 id="about-location">Visit AgentClinic</h2>
            <p>AgentClinic and these addresses are fictional and exist only for this demonstration project.</p>
          </header>
          <div class="about-location-grid">
            {locations.map((location) => <article class="about-location-card" aria-labelledby={`${location.slug}-name`}>
              <h3 id={`${location.slug}-name`}>{location.name}</h3>
              <address>{location.address}</address>
              <div class="about-map" data-map-enhancement data-map-url={location.embedUrl} data-map-name={location.name}>
                <p class="about-map-privacy" id={`${location.slug}-privacy`}>
                  Loading this interactive map contacts OpenStreetMap and may share your IP address and browser information with the provider.
                </p>
                <button class="button about-map-load" type="button" hidden data-map-load aria-describedby={`${location.slug}-privacy`}>
                  Load interactive map for {location.name}
                </button>
                <p class="about-map-status" role="status" aria-live="polite" data-map-status></p>
                <div class="about-map-frame" aria-label={`Interactive map area for ${location.name}`} data-map-region></div>
                <a class="button button--secondary about-map-link" href={location.searchUrl} target="_blank" rel="noopener noreferrer">
                  Open {location.address} in OpenStreetMap (opens in a new tab)
                </a>
              </div>
            </article>)}
          </div>
        </section>
      </article>
      <script src="/static/about-map.js" defer></script>
    </Layout>
  );
}
