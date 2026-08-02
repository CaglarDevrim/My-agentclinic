export type ActiveSection = "/" | "/agents" | "/ailments" | "/therapies" | "/reviews" | "/about" | "/dashboard";

interface HeaderProps { activePath: ActiveSection; }

export function Header({ activePath }: HeaderProps) {
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
    </header>
  );
}
