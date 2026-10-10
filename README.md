# Creator Finder Database

Production domain: <https://creator-finder.adamwhite.work>.

Tired of manually hunting down your favorite YouTubers on Patreon? Creator Finder Database automatically discovers where your favorite creators post content across platforms. Starting with YouTube integration, it helps fans:

- Find creators they already follow on new platforms
- Support creators through their preferred channels
- Discover creator content across multiple platforms

## Overview

Built with modern edge computing (Cloudflare Workers, D1) with Hono backend and a responsive Svelte frontend, Creator Finder Database provides instantaneous, global access to creator platform data with zero infrastructure overhead. Starting with YouTube integration, the service:

- Automatically imports YouTube subscriptions to jump start discovery
- Maps creator presence across multiple platforms
- Enables fans to find familiar creators on new platforms (especially for platforms with limited cross discoverability like Patreon)
- Helps creators understand and grow their cross-platform reach

### Current Status

MVP complete with YouTube integration, including:

- YouTube subscription imports
- Cross-platform creator search
- Cookie-based user preferences
- Asynchronous processing via Cloudflare Queues

## Known Limitations

- YouTube API quota restrictions (10,000 units/day): Excess requests are queued, retried, and eventually dropped after a few days.
- Workers subrequest limit (50 on free tier): Paid Workers plan allows 2000.
- Cookie-based session management limitations (<700 channelIds in a cookie): Not mitigated yet.

## Future Enhancements

### Platform Growth

- Additional, easy-to-add platforms: RSS, Twitter, GitHub, Mastodon, Behance, Vimeo
- Support for link aggregators (Linktree) and URL shorteners (Bitly)
- Automated link context extraction and subscription status refresh
- Integration with Google's Custom Search API and/or Knowledge Graph API
- Extraction of Open Graph (OG) tags or other metadata from websites
- Embed follow buttons for cross-platform discovery

### Data & Analytics

- Creator analytics dashboard showing platform distribution and activity
- Link insights and domain analysis for reducing duplicates
- Improved platform coverage tracking
- Domain-to-platform mapping (i.e., via Netify's data feeds)

### Community & UX

- In-app feedback system and feature changelog, offline usage with PWA
- Cross-platform creator recommendations
- Dynamic subscription import progress tracking on home page

### Value-Add Features

- Creator activity tracking across platforms
- Platform engagement analytics
- Data-driven insights for creator platform expansion
- Timeline tracking for creator connections

### Known Issues

- Invalid links aren't being checked.
- The chip links from YouTube descriptions aren't being read.
- There is no option to manually remove a subscription from MySubs.
- Subscription processing is too slow with new subscriptions.
- Platform icons are just emojis for now.
- Should use local storage or IndexedDB
- Unnecessarily exposes endpoints from Hono, missing quality tests

## Business Strategy

The platform can monetize through targeted features: premium subscriptions for automatic platform sync, affiliate partnerships with creator platforms, paid creator promotion opportunities, and analytics services.
Key strengths include solving a real discovery problem and leveraging existing APIs, while managing API access limitations and privacy considerations.
Growth opportunities exist in the expanding creator economy, though platform API changes and potential competitor solutions present challenges to monitor.

## Tools and Tech Stack

Frontend: Svelte application, providing a responsive and interactive user interface.

Backend: Hono, a fast and lightweight web framework optimized for Cloudflare, leveraging Cloudflare Workers to manage server-side functionality seamlessly.

Database: Cloudflare D1, a distributed SQL database, to store and manage creator data and link information efficiently.

Data Collection: YouTube API integration for automated link extraction from YouTube channels, with future potential for additional API integrations.

Hosting: Full stack hosting on Cloudflare for a streamlined, scalable deployment.

Paid Tier: Uses non-free Cloudflare Queues for asynchronous processing, check commit log if you want to revert. Workers Free is also limited to 50 subrequests, meaning you'll need to retry the request repeatedly during authorization, although it does work with that caveat.

## Development

Prerequisites:

- Hono: <https://hono.dev/docs/getting-started/cloudflare-workers>
- Cloudflare Workers: <https://developers.cloudflare.com/workers/get-started/dashboard>
- Cloudflare D1: <https://developers.cloudflare.com/d1/get-started>
- YouTube API: <https://developers.google.com/youtube/v3/getting-started>

Populate a local `.dev.vars` file as well as [Workers Environment Variables (Secrets)](https://developers.cloudflare.com/workers/configuration/secrets/) with the following:
YOUTUBE_API_KEY, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET.

`npm install` also installs the frontend dependencies. `npm test` runs the Worker regression checks, and `npm --prefix frontend run check` checks the Svelte application. Deployment builds the frontend before uploading the Worker.

### Google OAuth and domain configuration

- Google Cloud project: `creator-finder`; keep the existing web OAuth client and its ID.
- Production JavaScript origin: `https://creator-finder.adamwhite.work`.
- Production redirect URI: `https://creator-finder.adamwhite.work/callback`.
- Authorized consent-screen domain: `adamwhite.work`.
- Homepage: `https://creator-finder.adamwhite.work/`; privacy policy and terms: `https://creator-finder.adamwhite.work/terms.txt`.
- Local development origin and callback: `http://localhost:8787` and `http://localhost:8787/callback`.
- Start authorization through `/authorize`, which generates browser-bound state before redirecting to Google.

The custom domain is managed by `wrangler.toml`. The existing D1 database and queues are reused; do not reset the production database as part of deployment. After a domain change, users need to reauthorize and reimport subscriptions because browser cookies do not transfer between domains.

Install dependencies:

```sh
npm install
```

To run locally:

```sh
npm run dev
```

To deploy, either:

```sh
npm run deploy
```

Or, if you have configured [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds) simply push to the main branch, or open a pull request.

To tail the remote logs:

```sh
npx wrangler tail <WORKERS_NAME>
```

To reset or initialize the database:

```sh
npx wrangler d1 execute <DATABASE_NAME> --local --file='./db.sql' # local
npx wrangler d1 execute <DATABASE_NAME> --remote --file='./db.sql' # remote
```

## License

This project is licensed under the terms of the Mozilla Public License 2.0.
For more details, see the [LICENSE](./LICENSE.md) file.
