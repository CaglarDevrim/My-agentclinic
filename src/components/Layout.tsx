import type { PropsWithChildren } from "hono/jsx";

import { Footer } from "./Footer.js";
import { Header } from "./Header.js";
import { Main } from "./Main.js";

type LayoutProps = PropsWithChildren<{
  title?: string;
  activePath?: "/" | "/agents/patch";
}>;

export function Layout({
  children,
  title = "AgentClinic",
  activePath = "/",
}: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href="/static/style.css" />
      </head>
      <body>
        <Header activePath={activePath} />
        <Main>{children}</Main>
        <Footer />
      </body>
    </html>
  );
}
