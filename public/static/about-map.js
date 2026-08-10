(() => {
  for (const root of document.querySelectorAll("[data-map-enhancement]")) {
    if (!(root instanceof HTMLElement)) continue;
    const button = root.querySelector("[data-map-load]");
    const region = root.querySelector("[data-map-region]");
    const status = root.querySelector("[data-map-status]");
    const embedUrl = root.dataset.mapUrl;
    const siteName = root.dataset.mapName;

    if (!(button instanceof HTMLButtonElement) || !(region instanceof HTMLElement) || !(status instanceof HTMLElement) || !embedUrl || !siteName) continue;

    button.hidden = false;
    button.addEventListener("click", () => {
      if (region.querySelector("iframe")) return;

      const frame = document.createElement("iframe");
      frame.src = embedUrl;
      frame.title = `Interactive map showing ${siteName}`;
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer";
      region.append(frame);

      button.textContent = "Interactive map requested";
      button.setAttribute("aria-disabled", "true");
      status.textContent = `Interactive map requested for ${siteName}. The address and external map link remain available.`;
    });
  }
})();
