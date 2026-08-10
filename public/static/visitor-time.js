(() => {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") return;
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const format = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : formatter.format(date);
  };

  for (const option of document.querySelectorAll("option[data-visitor-time-option][data-utc]")) {
    if (option.dataset.localTimeEnhanced === "true") continue;
    const local = format(option.dataset.utc);
    if (!local) continue;
    option.textContent = `${option.textContent} — Your time: ${local}`;
    option.dataset.localTimeEnhanced = "true";
  }

  for (const element of document.querySelectorAll("[data-visitor-time][data-utc]")) {
    if (element.dataset.localTimeEnhanced === "true") continue;
    const local = format(element.dataset.utc);
    if (!local) continue;
    const detail = document.createElement("span");
    detail.className = "visitor-local-time";
    detail.textContent = `Your time: ${local}`;
    element.append(document.createElement("br"), detail);
    element.dataset.localTimeEnhanced = "true";
  }
})();
