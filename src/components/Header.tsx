export type ActiveSection = "/" | "/agents" | "/ailments" | "/therapies" | "/reviews" | "/about" | "/dashboard";

export interface StaffHeaderContext {
  displayName: string;
  csrfToken: string;
}

interface HeaderProps { activePath: ActiveSection; staff?: StaffHeaderContext; }

export function Header({ activePath, staff }: HeaderProps) {
  return (
    <header class="site-header">
      <div class="site-header__inner">
        <a
          class="site-brand"
          href="/"
          aria-current={activePath === "/" ? "page" : undefined}
        >
          AgentClinic
        </a>

        <nav class="site-nav" aria-label="Primary navigation">
          <ul>
            {[
              ["/agents", "Agents"],
              ["/ailments", "Ailments"],
              ["/therapies", "Therapies"],
              ["/reviews", "Customer Reviews"],
              ["/about", "About"],
              ["/dashboard", "Dashboard"],
            ].map(([href, label]) => (
              <li>
                <a
                  href={href}
                  aria-current={activePath === href ? "page" : undefined}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {staff && (
        <div class="staff-session" aria-label="Signed-in staff">
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
