export enum DATA_SOURCE {
  HN = 'hn', // hacker news
  REDDIT = 'reddit'
}

export enum MEATBALLS_DB_KEY {
  ACTIVITY = '_activity',
  LOGS = '_logs',
  GRAPH = '_meatballs',
  SEARCH = '_search'
}

export enum HTTP_METHOD {
  CONNECT = 'CONNECT',
  DELETE = 'DELETE',
  GET = 'GET',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
  PATCH = 'PATCH',
  POST = 'POST',
  PUT = 'PUT',
  TRACE = 'TRACE'
}

export enum HTTP_STATUS_CODE {
  OK = 200,
  NOT_MODIFIED = 304,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500
}
