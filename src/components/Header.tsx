export type ActiveSection = "/" | "/agents" | "/ailments" | "/therapies" | "/reviews" | "/about" | "/dashboard" | "/dashboard/reports";

export interface StaffHeaderContext {
  displayName: string;
  csrfToken: string;
  role: "staff" | "therapist";
}

interface HeaderProps { activePath: ActiveSection; staff?: StaffHeaderContext; }

export function Header({ activePath, staff }: HeaderProps) {
  const dashboardHref = staff?.role === "therapist" ? "/dashboard/schedule" : "/dashboard";
  const dashboardLabel = staff?.role === "therapist" ? "My schedule" : "Dashboard";
  const navigation = [
    ["/agents", "Agents"],
    ["/ailments", "Ailments"],
    ["/therapies", "Therapies"],
    ["/reviews", "Customer Reviews"],
    ["/about", "About"],
    [dashboardHref, dashboardLabel],
    ...(staff?.role === "staff" ? [["/dashboard/reports", "Reports"]] : []),
  ];
  return (
    <header class="site-header">
      <div class="site-header__inner">
        <a
          class="site-brand"
          href="/"
          aria-label="AgentClinic"
          aria-current={activePath === "/" ? "page" : undefined}
        >
          <svg class="site-brand__mark" viewBox="0 0 44 44" aria-hidden="true">
            <defs>
              <linearGradient id="agentclinic-brand-gradient" x1="6" y1="5" x2="38" y2="39" gradientUnits="userSpaceOnUse">
                <stop stop-color="#35a7f5" />
                <stop offset="1" stop-color="#8b5cf6" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="40" height="40" rx="12" fill="url(#agentclinic-brand-gradient)" />
            <path d="M22 12v20M12 22h20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" />
            <circle cx="22" cy="11" r="3" fill="#fff" />
            <circle cx="33" cy="22" r="3" fill="#fff" />
            <circle cx="22" cy="33" r="3" fill="#fff" />
            <circle cx="11" cy="22" r="3" fill="#fff" />
            <circle cx="22" cy="22" r="4.5" fill="#11161c" stroke="#fff" stroke-width="2" />
          </svg>
          <span class="site-brand__wordmark"><span>Agent</span><strong>Clinic</strong></span>
        </a>

        <nav class="site-nav" aria-label="Primary navigation">
          <ul>
            {navigation.map(([href, label]) => (
              <li>
                <a
                  href={href}
                  aria-current={activePath === href || (activePath === "/dashboard" && href === dashboardHref) ? "page" : undefined}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {staff && (
        <div class="staff-session" aria-label="Signed-in clinic account">
          <span>Signed in as <strong>{staff.displayName}</strong></span>
          <form method="post" action="/logout">
            <input type="hidden" name="_csrf" value={staff.csrfToken} />
            <button class="button button--secondary button--compact" type="submit">Sign out</button>
          </form>
        </div>
      )}
    </header>
  );
}
