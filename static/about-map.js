(() => {
  const embedUrl = "https://www.openstreetmap.org/export/embed.html?bbox=-122.4050%2C37.7665%2C-122.3850%2C37.7865&layer=mapnik&marker=37.7765%2C-122.3950";
  const root = document.querySelector("[data-map-enhancement]");

  if (!(root instanceof HTMLElement)) return;

  const button = root.querySelector("[data-map-load]");
  const region = root.querySelector("[data-map-region]");
  const status = root.querySelector("[data-map-status]");

  if (!(button instanceof HTMLButtonElement) || !(region instanceof HTMLElement) || !(status instanceof HTMLElement)) return;

  button.hidden = false;
  button.addEventListener("click", () => {
    if (region.querySelector("iframe")) return;

    const frame = document.createElement("iframe");
    frame.src = embedUrl;
    frame.title = "Interactive map showing the fictional AgentClinic location";
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer";
    region.append(frame);

    button.textContent = "Interactive map requested";
    button.setAttribute("aria-disabled", "true");
    status.textContent = "Interactive map requested. The address and external map link remain available.";
  });
})();
