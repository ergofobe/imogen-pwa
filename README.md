# imogen-pwa

The imogen web app as its own client, the way the iOS and Android apps are. It talks to a server through the SDK. It is not a server, and it does not publish a container image.

The SDK is the `imogen-sdk` git submodule, pinned to the commit `imogen-server` records (`b91b0eb3ed923e5dc3518dbc5201b10b233761c4`). `@imogen/sdk` and `@imogen/shared` resolve to that checkout (`package.json` `file:` and `overrides`). They are not registry dependencies.

`VITE_IMOGEN_SERVER_URL` is the deploy-time default. The installed app can replace it; the replacement is stored in the browser. Each account also remembers the server it signed in to.

Sign-in opens the server's own login (OAuth authorization code with PKCE, via `OAuthClient`). This app does not collect a password and does not run an identity provider. A session cookie still works when the app is served from the server itself. It is not the only way in: a stored bearer token is sent on later calls.

Several things the current server and SDK do not do yet are left undone. See the comments in `src/lib/authFlow.ts`.
