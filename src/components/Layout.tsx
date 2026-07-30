import type { PropsWithChildren } from "hono/jsx";

import { Footer } from "./Footer.js";
import { Header } from "./Header.js";
import { Main } from "./Main.js";

export function Layout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AgentClinic</title>
        <link rel="stylesheet" href="/static/style.css" />
      </head>
      <body>
        <Header />
        <Main>{children}</Main>
        <Footer />
      </body>
    </html>
  );
}
