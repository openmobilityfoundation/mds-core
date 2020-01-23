import { UrlOptions } from 'request'
import requestPromise, { RequestPromiseOptions } from 'request-promise'

// 120 seconds in ms
export const MAX_TIMEOUT_MS = Number(process.env.MAX_TIMEOUT_MS ?? 120000)

// Utility to add additional fields to error object
export const requestPromiseExceptionHelper = async (payload: UrlOptions & RequestPromiseOptions) => {
  try {
    return requestPromise(payload)
  } catch (err) {
    err.url = payload.url
    throw err
  }
}
