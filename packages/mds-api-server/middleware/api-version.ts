/**
 * Copyright 2019 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import express from 'express'
import { ApiRequest, ApiVersionedResponse } from '../@types'

const MinorVersion = (version: string) => {
  const [major, minor] = version.split('.')
  return `${major}.${minor}`
}

export const ApiVersionMiddleware = <V extends string>(mimeType: string, versions: readonly V[]) => ({
  withDefaultVersion: (preferred: V) => async (
    req: ApiRequest,
    res: ApiVersionedResponse<V>,
    next: express.NextFunction
  ) => {
    // Parse the Accept header into a list of values separated by commas
    const { accept: header } = req.headers
    const values = header ? header.split(',').map(value => value.trim()) : []

    // Parse the version and q properties from all values matching the specified mime type
    const accepted = values.reduce<{ version: string; q: number }[] | null>((accept, value) => {
      const [mime, ...properties] = value.split(';').map(property => property.trim())
      return mime === mimeType
        ? (accept ?? []).concat({
            ...properties.reduce<{ version: string; q: number }>(
              (info, property) => {
                const [key, val] = property.split('=').map(keyvalue => keyvalue.trim())
                return {
                  ...info,
                  version: key === 'version' ? val : info.version,
                  q: key === 'q' ? Number(val) : info.q
                }
              },
              { version: preferred, q: 1.0 }
            )
          })
        : accept
    }, null) ?? [
      {
        version: preferred,
        q: 1.0
      }
    ]

    // Determine if any of the requested versions are supported
    const supported = accepted
      .map(info => ({
        ...info,
        latest: versions.reduce<V | undefined>((latest, version) => {
          if (MinorVersion(info.version) === MinorVersion(version)) {
            if (latest) {
              return latest > version ? latest : version
            }
            return version
          }
          return latest
        }, undefined)
      }))
      .filter(info => info.latest !== undefined)

    if (req.method === 'OPTIONS') {
      /* If the incoming request is an OPTIONS request,
       * immediately respond with the negotiated version.
       * If the client did not negotiate a valid version, fall-through to a 406 response.
       */
      if (supported.length > 0) {
        const [{ latest }] = supported.sort((a, b) => b.q - a.q)
        if (latest) {
          res.locals.version = latest
          res.setHeader('Content-Type', `${mimeType};version=${MinorVersion(latest)}`)
          return res.status(200).send()
        }
      }
    } else if (supported.length > 0) {
      /* If the incoming request is a non-OPTIONS request,
       * set the negotiated version header, and forward the request to the next handler.
       * If the client did not negotiate a valid version, fall-through to provide the "preferred" version,
       * or, if they requested an invalid version, respond with a 406.
       */
      const [{ latest }] = supported.sort((a, b) => b.q - a.q)
      if (latest) {
        res.locals.version = latest
        res.setHeader('Content-Type', `${mimeType};version=${MinorVersion(latest)}`)
        return next()
      }
    } else if (values.length === 0) {
      /*
       * If no versions specified by the client for a non-OPTIONS request,
       * fall-back to latest internal version supported
       */
      res.locals.version = preferred
      res.setHeader('Content-Type', `${mimeType};version=${MinorVersion(preferred)}`)
      return next()
    }

    // 406 - Not Acceptable
    return res.sendStatus(406)
  }
})
