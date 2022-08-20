import processNewStories from './processNewStories'
import processStoryActivity from './processStoryActivity'
import processNewUser from './processNewUser'
import processUserActivity from './processUserActivity'
import processNewComments from './processNewComments'

export interface HackerNewsNativeStoryData {
  by?: string
  dead?: string // locked
  deleted?: boolean
  descendants?: number
  id: string
  score?: number
  text?: string
  time: number
  title?: string
  url?: string
}

export interface HackerNewsNativeUserData {
  about?: string
  created: number
  id: string
  karma: number
}

export interface HackerNewsNativeCommentData {
  author: string
  children: Array<HackerNewsNativeCommentData>
  created_at_i: number
  deleted?: boolean
  id: string
  parent_id: string
  story_id: string
  text: string
}

const HN_API_ENDPOINTS = {
    NEW_STORIES_NATIVE: 'https://hacker-news.firebaseio.com/v0/newstories.json',
    STORY_BY_ID_NATIVE: (id: string) =>
      `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
    USER_BY_ID_NATIVE: (id: string) =>
      `https://hacker-news.firebaseio.com/v0/user/${id}.json`,
    STORY_BY_ID_ALGOLIA: (id: string) =>
      `https://hn.algolia.com/api/v1/items/${id}`
  },
  HN_SOURCE_DOMAIN = 'news.ycombinator.com',
  HN_STORY_URL = (id: string) => `https://news.ycombinator.com/item?id=${id}`,
  HN_USER_URL = (id: string) => `https://news.ycombinator.com/user?id=${id}`

const flattenComments = (
  comments: Array<HackerNewsNativeCommentData>
): Array<HackerNewsNativeCommentData> =>
  comments.flatMap((comment) =>
    comment.children && comment.children.length > 0
      ? [comment, ...flattenComments(comment.children)]
      : comment
  )

export {
  HN_API_ENDPOINTS,
  HN_SOURCE_DOMAIN,
  HN_STORY_URL,
  HN_USER_URL,
  flattenComments,
  processNewStories,
  processStoryActivity,
  processNewUser,
  processUserActivity,
  processNewComments
}