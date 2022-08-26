export type UnsplashPhotoData = {
  blur_hash: string
  urls: {
    raw: string
  }
  links: {
    html: string
  }
  user: {
    username: string
    links: {
      html: string
    }
  }
}

const UNSPLASH_API_ENDPOINTS = {
  PHOTO_BY_QUERY: (query: string) =>
    `https://api.unsplash.com/search/photos?query="${query}"&per_page=1`
}

export { UNSPLASH_API_ENDPOINTS }
