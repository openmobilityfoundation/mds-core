import { UrlOptions } from 'request'
import requestPromise, { RequestPromiseOptions } from 'request-promise'

// Utility to add additional fields to error object
export const requestPromiseExceptionHelper = async (payload: UrlOptions & RequestPromiseOptions) => {
  try {
    return requestPromise(payload)
  } catch (err) {
    err.url = payload.url
    throw err
  }
}
