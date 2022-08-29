# meatballs.live

meatballs is an automated recommendation network and web app for discovering interesting conversations across social news.

The network currently supports [Hacker News](https://news.ycombinator.com), with more integrations planned.

By ingesting, connecting and analyzing large amounts of time-series data, meatballs (and associated services) is capable of weighting and generating daily collections of top stories, with a bias for the comment section.

![Screenshot of meatballs Frontpage and Comment Stream](assets/app-frontpage-and-comment-stream.png)

![Screenshot of meatballs Collections Grid](assets/app-collections-grid.png)

![Screenshot of meatballs Collection Modal](assets/app-collection-modal.png)

# Overview video (Optional)

Here's a short video that explains the project and how it uses Redis:

[![meatballs Video Introduction](assets/video-screenshot.png)](https://www.youtube.com/watch?v=vyxdC1qK4NE)

## How it works

meatballs was created for the DEV.to x Redis Hackathon, with three primary design goals:

1. leverage the Redis Stack to consume, process, sift and generate insights from big data
2. learn and utilize as many multi-model capabilities of the Redis Stack as possible
3. combine 1 and 2 to create a compelling user experience

The high level architecture for meatballs is as follows:

![meatballs high-level architecture diagram](assets/meatball-architecture-diagram.png)

To meet the challenge, meatballs is three open-source projects:

- web app (UI) made with TypeScript and Next.js (this project)
- node server called [**meatballs.live-jobs (casper)**](https://github.com/ritsuke/meatballs.live-jobs) responsible for making scheduled, weighted calls to the [`ingest`](https://github.com/ritsuke/meatballs.live/tree/main/src/pages/api/services/ingest) and [`generate`](https://github.com/ritsuke/meatballs.live/tree/main/src/pages/api/services/generate) service APIs
- node server called [**meatballs.live-stream (kodama)**](https://github.com/ritsuke/meatballs.live-stream) responsible for processing Redis pub/sub events via web sockets

### How the data is stored:

Refer to [this example](https://github.com/redis-developer/basic-analytics-dashboard-redis-bitmaps-nodejs#how-the-data-is-stored) for a more detailed example of what you need for this section.

### How the data is accessed:

Refer to [this example](https://github.com/redis-developer/basic-analytics-dashboard-redis-bitmaps-nodejs#how-the-data-is-accessed) for a more detailed example of what you need for this section.

## How to run it locally?

This is a complex, **wacky wildcard** of a platform, with three projects to configure. Strap in tight!

If you have any issues, please open a ticket.

For sanity, the three projects that must be setup will be referred to as:

1. APP ([meatballs.live](https://github.com/ritsuke/meatballs.live); this project)
2. JOBS SERVER ([meatballs.live-jobs](https://github.com/ritsuke/meatballs.live-jobs))
3. STREAM SERVER ([meatballs.live-stream](https://github.com/ritsuke/meatballs.live-stream))

### Prerequisites

- [Git](https://git-scm.com/downloads) 2.37.2
- [Node](https://nodejs.org/download/release/v16.5.0/) 16.50.0
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/) 1.22.19
- [Thunder Client for VS Code](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client); optional, but required to use [thunder-tests](https://github.com/ritsuke/meatballs.live/tree/main/thunder-tests)
- Redis Stack DB credentials and endpoint ([Redis Cloud](https://redis.info/try-free-dev-to) or [local install](stack))
- [Github account](https://github.com/settings/apps); app credentials (auth)
- [Upstash account](https://upstash.com/blog/next-auth-serverless-redis); app credentials (auth)
- [Unsplash account](https://unsplash.com/oauth/applications); DB credentials and endpoint (collection cover)

### Local installation

Let's start with the APP...

1. Clone this repo
2. Run `yarn` in the project folder to install dependencies
3. Copy `.env.sample` to `.env` and fill in your unique values, following the steps below:

`REDIS_DB_URL`

1. Copy and paste your Redis endpoint URL (e.g. `redis://USERNAME:PASSWORD@HOST:PORT`) to your `.env` file

[`NEXTAUTH_URL`](https://next-auth.js.org/configuration/options#nextauth_url)

1. Copy and paste `https://localhost:3000` to your `.env` file

[`NEXTAUTH_SECRET`](https://next-auth.js.org/configuration/options#nextauth_secret)

1. Run `openssl rand -base64 32` in your terminal to generate, then copy and paste to your `.env` file; Windows users can use **Git Bash**, **WSL**, etc.

`GITHUB_CLIENT_ID`

1. Head to [https://github.com/settings/apps](https://github.com/settings/apps) and click **New GitHub App**
2. Enter the app name and home page URL
3. Set your callback URL to `http://localhost:3000/api/auth/callback/github`
4. Disable webhook, scroll to the bottom and click **Create GitHub App**
5. On the app page, copy and paste your client ID to your `.env` file

`GITHUB_CLIENT_SECRET`

6. Below where you got the client ID, click **Generate a new client secret**, then copy and paste the new client secret to your `.env` file

`UPSTASH_REDIS_AUTH_REST_URL`

1. [Sign up](https://console.upstash.com/login) for a free Upstash account and at the console, under the **Redis** tab, click **Create database**
2. Name your database, select type and region, enable TLS and click **Create**
3. Under the new database details, scroll to **REST API** and copy paste the rest URL to your `.env` file

`UPSTASH_REDIS_AUTH_REST_TOKEN`

4. Right next to that, copy and paste the rest token to your `.env` file

`UPSTASH_REDIS_AUTH_PREFIX`

5. Copy and paste `meatballs-live:` to your `.env` file; this prepends auth-specific keys in-case you use the server for other data

`UNSPLASH_ACCESS_KEY`

1. Create a free [Unsplash](https://unsplash.com/join) account
2. Navigate to [your apps](https://unsplash.com/oauth/applications), click **New Application** and **Accept Terms**
3. Enter application name and description
4. Scroll to down to **Keys**; copy and paste the access key to your `.env` file

`SOURCE_USER_AGENT`

meatballs.live (APP) [**ingest**](https://github.com/ritsuke/meatballs.live/tree/main/src/utils/ingest) and [**generate**](https://github.com/ritsuke/meatballs.live/tree/main/src/utils/generate) processors make requests to 3rd party APIs; enter a value that identifies you to these APIs

---

Before configuring the remaining environment variables, clone [meatballs.live-jobs](https://github.com/ritsuke/meatballs.live-jobs) (JOBS SERVER).

Follow the [README](https://github.com/ritsuke/meatballs.live-jobs/blob/main/README.md) and then continue with this guide.

---

At this point, you should have **meatballs.live-jobs** (JOBS SERVER) configured.

Welcome back! Let's continue.

`INGEST_API_KEY`

1. Paste the key from **meatballs.live-jobs** (JOBS SERVER) to your `.env` file; these must match between the two projects, as the APP API uses this key for authenticated calls from the JOBS SERVER

Copy your `REDIS_DB_URL` value. You will need if for the next step.

---

Before configuring the remaining environment variables, clone [meatballs.live-stream](https://github.com/ritsuke/meatballs.live-jobs) (STREAM SERVER).

Follow the [README](https://github.com/ritsuke/meatballs.live-stream/blob/main/README.md) and then continue with this guide.

---

`COMMENT_STREAM_URL`

1. Enter `https://localhost:{PORT}`, replacing `{PORT}` with the value used by the STREAM SERVER development environment

`MEATBALLS_COLLECTIONS_START_DATE_KEY`

You will need to configure this accurately once you've generated your first collection. However, you first need to ingest a few days of content.

For now, just use `2022:8:22`. We'll come back to this.

Run `yarn dev`. The APP's development server should now be running at `http://localhost:3000`, but we aren't quite ready to use the front end. This next step will be focused on testing the API.

---

The APP has 3 service APIs. If you are using the Thunder Client extension for VS Code, these requests have been mocked for testing, but you can use any tool you'd like. Here are the endpoints:

```
POST localhost:3000/api/services/ingest/new-stories?dataSource=hn&limit=1
```

```
POST localhost:3000/api/services/ingest/story-activity?dataSource=hn&start=0&end=10&commentWeight=4&falloff=20
```

```
POST localhost:3000/api/services/generate/new-collections?dataSource=hn&dateKey=2022:8:28
```

Each service endpoint accepts an `Authorization` header with value `Bearer {INGEST_API_KEY}`. These APIs should only be called for testing and by the JOBS SERVER.

The two service APIs you should test now are `new-stories` and `story-activity`.

Starting with `new-stories`, parameters `dataSource` should be set to `hn` (Hacker News) with a `limit` of `1`. The Hacker News API that is called by the [new stories ingest processor](https://github.com/ritsuke/meatballs.live/blob/main/src/utils/ingest/hn/processNewStories.ts) returns 500 stories, but we only want to process 1 for testing.

[screenshot redis insight]

## Deployment

Though meatballs uses [Vercel](https://vercel.com) to automatically deploy the UI, you can run the meatballs UI on any host capable of serving a Next.js app.

### Getting Started

1. Sign up for a [free Redis Cloud account using this link](https://redis.info/try-free-dev-to) and use the [Redis Stack database in the cloud](https://developer.redis.com/create/rediscloud).
1. Based on the language/framework you want to use, you will find the following client libraries:
   - [Redis OM .NET (C#)](https://github.com/redis/redis-om-dotnet)
     - Watch this [getting started video](https://www.youtube.com/watch?v=ZHPXKrJCYNA)
     - Follow this [getting started guide](https://redis.io/docs/stack/get-started/tutorials/stack-dotnet/)
   - [Redis OM Node (JS)](https://github.com/redis/redis-om-node)
     - Watch this [getting started video](https://www.youtube.com/watch?v=KUfufrwpBkM)
     - Follow this [getting started guide](https://redis.io/docs/stack/get-started/tutorials/stack-node/)
   - [Redis OM Python](https://github.com/redis/redis-om-python)
     - Watch this [getting started video](https://www.youtube.com/watch?v=PPT1FElAS84)
     - Follow this [getting started guide](https://redis.io/docs/stack/get-started/tutorials/stack-python/)
   - [Redis OM Spring (Java)](https://github.com/redis/redis-om-spring)
     - Watch this [getting started video](https://www.youtube.com/watch?v=YhQX8pHy3hk)
     - Follow this [getting started guide](https://redis.io/docs/stack/get-started/tutorials/stack-spring/)

The above videos and guides should be enough to get you started in your desired language/framework. From there you can expand and develop your app. Use the resources below to help guide you further:

1. [Developer Hub](https://redis.info/devhub) - The main developer page for Redis, where you can find information on building using Redis with sample projects, guides, and tutorials.
1. [Redis Stack getting started page](https://redis.io/docs/stack/) - Lists all the Redis Stack features. From there you can find relevant docs and tutorials for all the capabilities of Redis Stack.
1. [Redis Rediscover](https://redis.com/rediscover/) - Provides use-cases for Redis as well as real-world examples and educational material
1. [RedisInsight - Desktop GUI tool](https://redis.info/redisinsight) - Use this to connect to Redis to visually see the data. It also has a CLI inside it that lets you send Redis CLI commands. It also has a profiler so you can see commands that are run on your Redis instance in real-time
1. Youtube Videos
   - [Official Redis Youtube channel](https://redis.info/youtube)
   - [Redis Stack videos](https://www.youtube.com/watch?v=LaiQFZ5bXaM&list=PL83Wfqi-zYZFIQyTMUU6X7rPW2kVV-Ppb) - Help you get started modeling data, using Redis OM, and exploring Redis Stack
   - [Redis Stack Real-Time Stock App](https://www.youtube.com/watch?v=mUNFvyrsl8Q) from Ahmad Bazzi
   - [Build a Fullstack Next.js app](https://www.youtube.com/watch?v=DOIWQddRD5M) with Fireship.io
   - [Microservices with Redis Course](https://www.youtube.com/watch?v=Cy9fAvsXGZA) by Scalable Scripts on freeCodeCamp
