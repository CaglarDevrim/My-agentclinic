import type { PropsWithChildren } from "hono/jsx";

import { Footer } from "./Footer.js";
import { Header, type ActiveSection, type StaffHeaderContext } from "./Header.js";
import { Main } from "./Main.js";

type LayoutProps = PropsWithChildren<{
  title?: string;
  activePath?: ActiveSection;
  staff?: StaffHeaderContext;
  visitorTime?: boolean;
}>;

export function Layout({
  children,
  title = "AgentClinic",
  activePath = "/",
  staff,
  visitorTime = false,
}: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#11161c" />
        <title>{title}</title>
        <link rel="icon" href="/static/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/static/style.css" />
        {visitorTime && <script src="/static/visitor-time.js" defer></script>}
      </head>
      <body>
        <Header activePath={activePath} staff={staff} />
        <Main>{children}</Main>
        <Footer />
      </body>
    </html>
  );
}
