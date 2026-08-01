interface HeaderProps {
  activePath: "/" | "/agents/patch";
}

export function Header({ activePath }: HeaderProps) {
  return (
    <header class="site-header">
      <a class="site-brand" href="/">
        AgentClinic
      </a>

      <form class="search-form" role="search" action="/" method="get">
        <label class="visually-hidden" for="clinic-search">
          AgentClinic'te ara
        </label>
        <input
          id="clinic-search"
          name="q"
          type="search"
          placeholder="AgentClinic'te ara..."
        />
        <button type="submit" aria-label="Ara">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
        </button>
      </form>

      <nav class="site-nav" aria-label="Primary navigation">
        <ul>
          <li>
            <a
              href="/"
              aria-current={activePath === "/" ? "page" : undefined}
            >
              Home
            </a>
          </li>
          <li>
            <a
              href="/agents/patch"
              aria-current={
                activePath === "/agents/patch" ? "page" : undefined
              }
            >
              Patch
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
