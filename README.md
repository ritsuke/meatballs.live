# meatballs.live

meatballs is an automated recommendation network and web app for discovering interesting conversations across social news.

Live deployment: https://www.meatballs.live

The network currently supports [Hacker News](https://news.ycombinator.com), with more integrations planned.

By ingesting, connecting and analyzing large amounts of structured, temporal data, meatballs (and associated services) is capable of weighting and generating daily collections of top stories, with a bias for the comment section.

![Screenshot of meatballs Frontpage and Comment Stream](assets/app-frontpage-and-comment-stream.png)

![Screenshot of meatballs Collections Grid](assets/app-collections-grid.png)

![Screenshot of meatballs Collection Modal](assets/app-collection-modal.png)

![Screenshot of meatballs Collection Modal on iPad](assets/app-collection-modal-ipad.png)

# Overview video

Here's a short video that explains the project and how it uses Redis:

[![meatballs Video Introduction](assets/video-screenshot.png)](https://www.youtube.com/watch?v=vyxdC1qK4NE)

## How it works

---

meatballs was created for the [DEV.to x Redis Hackathon](https://dev.to/devteam/announcing-the-redis-hackathon-on-dev-3248), with three primary design goals:

1. leverage the Redis Stack to consume, process, sift and generate insights from big data
2. learn and utilize as many multi-model capabilities of the Redis Stack as possible
3. combine 1 and 2 to create a fast and compelling user experience for desktop and mobile

To meet the challenge, meatballs is three open-source projects:

- **APP / UI**
  - snappy web app made with TypeScript and Next.js that only consumes cache and socket-based, real-time data (this project)
- **JOBS SERVER**
  - node server called [**meatballs.live-jobs (casper)**](https://github.com/ritsuke/meatballs.live-jobs) responsible for making scheduled, weighted calls to the [`ingest`](https://github.com/ritsuke/meatballs.live/tree/main/src/pages/api/services/ingest) service APIs
- **STREAM SERVER**
  - node server called [**meatballs.live-stream (kodama)**](https://github.com/ritsuke/meatballs.live-stream) responsible for processing Redis pub/sub events via web sockets

The high level architecture for meatballs is as follows:

![meatballs high-level architecture diagram](assets/meatballs-architecture-diagram.png)

The JOBS SERVER (casper) calls the APP's [services APIs to ingest](https://github.com/ritsuke/meatballs.live/tree/main/src/pages/api/services/ingest), process and route source data from Hacker News ([Official](https://github.com/HackerNews/API) | [Algolia](https://hn.algolia.com/api)) to the primary Redis database.

Ingest data is saved to [JSON](https://redis.io/docs/stack/json/), [graph](https://redis.io/docs/stack/graph/), [time series](https://redis.io/docs/stack/timeseries/) and cache (see details in the following sections).

The APP's front end UI connects to the STREAM SERVER (kodama) via web sockets ([Socket.io](https://socket.io)). The STREAM SERVER [subscribes to Redis channels](https://redis.io/docs/manual/pubsub/) for presence, new comments and frontpage stats and emits events to connected APP clients. The STREAM SERVER also publishes to the presence channel as clients connect and disconnect.

On new story activity, the JOBS SERVER (casper) [publishes](https://redis.io/docs/manual/pubsub/) an update to the Frontpage stats channel, which is sent as an event from the STREAM SERVER to connected APP clients. On new comments from an APP user, the APP front end calls the protected [`publish-comments`](https://github.com/ritsuke/meatballs.live/blob/main/src/pages/api/stream/publish-comment.ts) API to publish to the new comments channels.

APP users must be signed in to send new comments. For authentication, the APP uses a combination of [NextAuth](https://next-auth.js.org), [GitHub](https://next-auth.js.org/providers/github) and [Upstash](https://upstash.com/blog/next-auth-serverless-redis). Yes, even auth on the backend is persisted to a Redis server!

After at least 24 hours of ingest data, the APP's services [API for generating collections](https://github.com/ritsuke/meatballs.live/tree/main/src/pages/api/services/generate) can be called. The [generate processor](https://github.com/ritsuke/meatballs.live/blob/main/src/utils/generate/processNewCollections.ts) uses a combination of time series, graph and JSON queries and search to create JSON->string caches for the day (9 stories) and each individual story collection.

Here's a live example:

- Collections page: https://www.meatballs.live/c/2022/8/27/
- Collection page: https://www.meatballs.live/c/2022/8/27/ask-hn-how-can-i-come-to-peace-with-the-years-i-wasted-on-pointless-things-9o2r6s3o/

When accessing a collections or collection page, the APP leverages [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props) to retrieve and parse the respective cache data, which is then sent to the user.

Hosted by [Redis Cloud](https://redis.info/try-free-dev-to) and [Vercel](https://vercel.com), story collections and collection page renders are between 1-5 milliseconds!

---

### Additional metrics

REDIS CLOUD

![Redis Cloud Metrics (various charts)](assets/redis-cloud-metrics.png)

VERCEL (APP UI and APIs)

Serverless Functions

![Vercel Metrics (bar chart; serverless functions)](assets/vercel-serverless-metrics.png)

Execution

![Vercel Metrics (bar chart; executions)](assets/vercel-execution-metrics.png)

RAILWAY (JOBS and STREAM SERVERS)

![Railway Metrics (cpu and ram chart)](assets/railway-metrics.png)

---

### How the data is stored:

#### [RedisGraph](https://redis.io/docs/stack/graph/) Models

- KEY-> `_meatballs`

![meatballs graph model diagram](assets/meatballs-graph-model-diagram.png)

#### [RedisJSON](https://redis.io/docs/stack/json/) Models w/ [Redis OM](https://github.com/redis/redis-om-node) | [View Source](https://github.com/ritsuke/meatballs.live/tree/main/src/redis/om)

**[Story](https://github.com/ritsuke/meatballs.live/blob/main/src/redis/om/story.ts)**

- KEY-> `Story:{data_source}:{story_id}`

```
export interface Story {
  content: string | null
  title: string | null
}

const storySchema = new Schema(Story, {
  content: { type: 'text' },
  title: { type: 'text' }
})
```

**[User](https://github.com/ritsuke/meatballs.live/blob/main/src/redis/om/user.ts)**

- KEY-> `User:{data_source}:{user_id}`

```
export interface User {
  about: string | null
}

const userSchema = new Schema(User, {
  about: { type: 'text' }
})
```

**[Comment](https://github.com/ritsuke/meatballs.live/blob/main/src/redis/om/comment.ts)**

- KEY-> `Comment:{data_source}:{comment_id}`

```
export interface Comment {
  content: string | null
}

const commentSchema = new Schema(Comment, {
  content: { type: 'text' }
})
```

**[Collection](https://github.com/ritsuke/meatballs.live/blob/main/src/redis/om/collection.ts)**

- KEY-> `Collection:{year}:{month}:{day}:{collection_id}`

```
export interface Collection {
  year: number
  month: number
  day: number
  title: string | null
  slug: string | null
  top_comment: string | null
  comment_total: number
  image_username: string | null
  image_user_url: string | null
  image_url: string | null
  image_source_url: string | null
  image_blur_hash: string | null
  position: number
  origins: string[]
}

const collectionSchema = new Schema(Collection, {
  year: { type: 'number' },
  month: { type: 'number' },
  day: { type: 'number' },
  title: { type: 'text' },
  slug: { type: 'string' },
  top_comment: { type: 'text' },
  comment_total: { type: 'number' },
  image_username: { type: 'string' },
  image_user_url: { type: 'string' },
  image_url: { type: 'string' },
  image_source_url: { type: 'string' },
  image_blur_hash: { type: 'string' },
  position: { type: 'number', sortable: true },
  origins: { type: 'string[]' }
})
```

#### [RedisTimeSeries](https://redis.io/docs/stack/timeseries/)

**Story**

- KEY-> `Story:{data_source}:{story_id}:_activity:weighted`
- KEY-> `Story:{data_source}:{story_id}:_activity:weighted:hour`
- KEY-> `Story:{data_source}:{story_id}:_activity:weighted:day`

**Collections Cache (as STRING)**

- KEY-> `Collection:{year}:{month}:{day}:\_cache`

[Collection](https://github.com/ritsuke/meatballs.live/blob/main/src/redis/om/collection.ts)[]

**Collection Cache (as STRING)**

- KEY-> `Collection:{year}:{month}:{day}:{collection_id}:\_cache`

```
story: {
  id: string
  content: string | null
  created: number
  created_by: string
  address: string | null
}
comments: Array<{
  id: string
  content: string
  created: number
  created_by: string
}>
recommended_stories: Array<{
  id: string
  title: string
}>
```

### How the data is accessed:

To keep the user experience snappy, the meatballs.live APP only accesses cache data via [getServerSideProps](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props).

**Collections by Date** | [View Source](https://github.com/ritsuke/meatballs.live/blob/main/src/pages/c/%5Byear%5D/%5Bmonth%5D/%5Bday%5D/%5B%5B...slug%5D%5D.tsx#L68)

`GET Collection:{year}:{month}:{day}:\_cache`

**Specific Collection** | [View Source](https://github.com/ritsuke/meatballs.live/blob/main/src/pages/c/%5Byear%5D/%5Bmonth%5D/%5Bday%5D/%5B%5B...slug%5D%5D.tsx#L122)

`GET Collection:{year}:{month}:{day}:{collection_id}:\_cache`

Otherwise, the APP's services APIs (called by the [JOBS SERVER](https://github.com/ritsuke/meatballs.live-jobs)) executes **ingest** and **generate** processors for CRUD operations. The following documents the [Redis commands](https://redis.io/commands/) for ingesting new stories, but note that the APP utilizes [**node-redis**](https://github.com/redis/node-redis) and [**redis-node-om**](https://github.com/redis/redis-om-node) to create the respective clients.

`src/pages/api/services/ingest/new-stories.ts` -> [`processNewStories`](https://github.com/ritsuke/meatballs.live/blob/main/src/utils/ingest/hn/processNewStories.ts)

1. `JSON.GET Story:{DATA_SOURCE}:{story_id}`
2. executes [`processUserActivity`](https://github.com/ritsuke/meatballs.live/blob/main/src/utils/ingest/hn/processUserActivity.ts)
   - `EXISTS User:{DATA_SOURCE}:{user_id}`
   - `JSON.GET User:{DATA_SOURCE}:{user_id}`
   - `JSON.SET User:{DATA_SOURCE}:{user_id} $ {{new_user_data}}`
   - `GRAPH.QUERY _meatballs 'MERGE (:User { name: "{user_id}", created: {timestamp_in_seconds}, score: {new_user_karma} })'`
3. checks if time series data exists
   - `EXISTS Story:{data_source}:{story_id}:_activity:weighted`
   - `EXISTS Story:{data_source}:{story_id}:_activity:weighted:hour`
   - `EXISTS Story:{data_source}:{story_id}:_activity:weighted:day`
4. creates [transaction](https://redis.io/commands/multi/) for time series data
   - `TS.CREATE Story:{data_source}:{story_id}:_activity:weighted DUPLICATE_POLICY MAX LABELS domain {story_domain} story {story_id} user {user_id} type weighted`
   - `TS.CREATE Story:{data_source}:{story_id}:_activity:weighted:hour DUPLICATE_POLICY MAX LABELS domain {story_domain} story {story_id} user {user_id} type weighted compacted hour`
   - `TS.CREATERULE Story:{data_source}:{story_id}:_activity:weighted Story:{data_source}:{story_id}:_activity:weighted:hour AGGREGATION sum {hour_in_milliseconds}`
   - `TS.CREATE Story:{data_source}:{story_id}:_activity:weighted:day DUPLICATE_POLICY MAX LABELS domain {story_domain} story {story_id} user {user_id} type weighted compacted day`
   - `TS.CREATERULE Story:{data_source}:{story_id}:_activity:weighted Story:{data_source}:{story_id}:_activity:weighted:day AGGREGATION sum {day_in_milliseconds}`
   - `TS.ADD Story:{data_source}:{story_id}:_activity:weighted {now_in_milliseconds} {story_activity_time_series_sample_value}` | [View Source](https://github.com/ritsuke/meatballs.live/blob/3a79de60d15e7fce8b251ff7e58712a830ce32fe/src/utils/ingest/hn/index.ts#L72) | retention period is not set, but you may wish to, to save space
5. [Executes](https://redis.io/commands/exec/) time series transaction, saves story JSON and saves nodes and relationships to the graph
   - `JSON.SET Story:{DATA_SOURCE}:{storyId} $ {{story_data}}`
   - View the [source](https://github.com/ritsuke/meatballs.live/blob/3a79de60d15e7fce8b251ff7e58712a830ce32fe/src/utils/ingest/hn/processNewStories.ts#L226), as the [Cypher](https://neo4j.com/developer/cypher/) query is long

The next two processors are more complex. To keep this README manageable, please consult the respective processor source.

`src/pages/api/services/ingest/story-activity.ts` -> [`processStoryActivity`](https://github.com/ritsuke/meatballs.live/blob/main/src/utils/ingest/hn/processStoryActivity.ts)

- executes [`processNewComments`](https://github.com/ritsuke/meatballs.live/blob/3a79de60d15e7fce8b251ff7e58712a830ce32fe/src/utils/ingest/hn/processNewComments.ts)
- [Publishes](https://github.com/ritsuke/meatballs.live/blob/main/src/utils/ingest/hn/processStoryActivity.ts#L247) total node count from graph

`src/pages/api/services/generate/new-collections.ts` -> [`processNewCollections`](https://github.com/ritsuke/meatballs.live/blob/main/src/utils/generate/processNewCollections.ts)

**Comment Stream**

The APP connects to the [STREAM SERVER](https://github.com/ritsuke/meatballs.live-stream) via web sockets.

The STREAM SERVER [creates a pub and sub Redis client](https://github.com/ritsuke/meatballs.live-stream/blob/main/src/index.ts) for emitting events to connected APP sockets.

**RedisInsight Examples**

The following visually represents times series data (compacted by hour) from the 22nd to the 29th, using the workbench in [RedisInsight](https://redis.com/redis-enterprise/redis-insight/) with command:

```
TS.MRANGE - + FILTER type=weighted compacted=hour GROUPBY story REDUCE max
```

![meatballs time series data compacted by hour](assets/redis-insight-time-series-data.png)

The following visually represents graph data for a random story, showing the relationship of comment reactions to the story and the users that created them:

```
GRAPH.QUERY
  MATCH graph=(:Story { name: "hn:32532438"})-->(:Comment)-[:REACTION_TO*1..]-(:Comment)<-[:CREATED]-(:User)
  RETURN graph
```

![meatballs graph data by story](assets/redis-insight-graph-data.png)

---

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

You will need to configure this accurately, once you've generated your first collection. However, you first need to ingest at least 24 hours of source data.

For now, just use `2022:8:29`. We'll come back to this.

Run `yarn dev`. The APP's development server should now be running at `http://localhost:3000`, but we aren't quite ready to use the front end.

Open two additional terminals and run `yarn dev` in the JOBS SERVER and STREAM SERVER project folders to start the respective development servers.

The JOBS SERVER will kick-of the ingest process. At this time, you should see logging coming from the APP and JOB SERVER terminals. If not, double check the steps above.

- You will need to keep both of these running for approx. 24 hours before generating your first collection
- `MEATBALLS_COLLECTIONS_START_DATE_KEY` should be set to this initial time e.g. `2022:8:29`
- The `STREAM SERVER` is optional to run, but a number of UI components rely on pub events to fully function

You can now open the front end in your browser, available at `http://localhost:3000`. You will see something like the following:

![meatballs Frontpage and Comment Stream](assets/app-frontpage-and-comment-stream.png)

Clicking on **collections** will result in a 404.

Has it been 24 hours? If so, generate your first collection!

1. Copy the `INGEST_API_KEY` value from your APP's `.env` file
2. Use the client of your choice to make the following API call:

```
POST localhost:3000/api/services/generate/new-collections?dataSource=hn&dateKey=2022:8:29

Accept: */*
User-Agent: localhost
Authorization: Bearer {INGEST_API_KEY}
```

TIP: Use the included [Thunder Client](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client) mocks.

3. Update the APP's `MEATBALLS_COLLECTIONS_START_DATE_KEY` environment variable (e.g. `2022:8:29`) to the date where you have the first 24 hours of data
4. Restart the APP's development server, open `http://localhost:3000` in your browser and click **collections**

## Deployment

Though meatballs uses [Vercel](https://vercel.com) to automatically deploy the APP, you can run the meatballs APP on any host capable of serving a Next.js app.

Ensure that the [JOBS SERVER](https://github.com/ritsuke/meatballs.live-jobs) and [STREAM SERVER](https://github.com/ritsuke/meatballs.live-stream) are also deployed.

## More Information about Redis Stack

---

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
