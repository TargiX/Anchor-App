# Website traffic

Prepared for self-hosted Umami at https://stats.phosphene.cc. Website ID: `4a4fcdb3-f4ce-436d-afd8-e0e16c5d6cd5`. Production hosts: anchorapp.cc, www.anchorapp.cc, anchor.ilyamoskovkin.com, next-js-tether-targix.vercel.app.

Only pageviews are sent. Static route names are allowlisted; all other routes become `/other`. Titles are a fixed product name. Referrers retain only their origin. Queries, hashes, user IDs, form values, journal content, resume content, custom events and replay are excluded. Recovery/token URLs skip tracker loading. Do Not Track and Global Privacy Control are respected. Localhost, native app origins and previews do not load the tracker.

Production activation requires a healthy HTTPS collector and verification of ingestion from the deployed site. This source change alone does not prove live tracking. Remove the loader and redeploy to disable; historical data stays on the server.
