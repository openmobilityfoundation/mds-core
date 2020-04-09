/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import fs from 'fs'
import { format, normalize } from 'path'
import { homedir } from 'os'
import { promisify } from 'util'
import logger from '@mds-core/mds-logger'
import { NotFoundError, UnsupportedTypeError } from '@mds-core/mds-utils'
import JSON5 from 'json5'
import { ServiceResponse, ServiceError, ServiceResult } from '@mds-core/mds-service-helpers'

const getFilePath = (property: string, ext: '.json' | '.json5'): string => {
  const { MDS_CONFIG_PATH = '/mds-config' } = process.env
  const dir = MDS_CONFIG_PATH.replace('~', homedir())
  return normalize(format({ dir, name: property, ext }))
}

const readFileAsync = promisify(fs.readFile)
const readFile = async (path: string): Promise<string> => {
  try {
    const utf8 = await readFileAsync(path, { encoding: 'utf8' })
    return utf8
  } catch (error) {
    throw new NotFoundError('Settings File Not Found', { error, path })
  }
}

const parseJson = <TSettings extends {}>(
  json: string,
  { parser = JSON }: Partial<{ parser: JSON }> = {}
): TSettings => {
  try {
    return parser.parse(json) as TSettings
  } catch (error) {
    throw new UnsupportedTypeError('Settings File must contain JSON', { error })
  }
}

const readJsonFile = async <TSettings extends {}>(property: string): Promise<ServiceResponse<TSettings>> => {
  try {
    const json5 = await readFile(getFilePath(property, '.json5'))
    return ServiceResult(
      parseJson<TSettings>(json5, { parser: JSON5 })
    )
  } catch {
    try {
      const json = await readFile(getFilePath(property, '.json'))
      return ServiceResult(parseJson<TSettings>(json))
    } catch (error) {
      return ServiceError(error)
    }
  }
}

interface GetSettingsOptions {
  partial: boolean
}

export const client = {
  getSettings: async <TSettings extends {}>(
    properties: string[],
    { partial = false }: Partial<GetSettingsOptions> = {}
  ): Promise<ServiceResponse<TSettings, NotFoundError>> => {
    const settings = await Promise.all(properties.map(property => readJsonFile<TSettings>(property)))
    const result = settings.reduce<{ found: string[]; missing: string[] }>(
      (info, [error], index) =>
        error
          ? { ...info, missing: [...info.missing, properties[index]] }
          : { ...info, found: [...info.found, properties[index]] },
      { found: [], missing: [] }
    )
    return result.missing.length > 0 && !partial
      ? ServiceError(new NotFoundError('Settings Not Found', result))
      : ServiceResult(
          settings.reduce<TSettings>(
            (merged, [error, setting], index) => Object.assign(merged, error ? { [properties[index]]: null } : setting),
            {} as TSettings
          )
        )
  }
}

const loadSettings = async <TSettings extends {}>(
  properties: string[],
  options: Partial<GetSettingsOptions>
): Promise<ServiceResponse<TSettings>> => {
  const loaded = await client.getSettings<TSettings>(properties, options)
  const [error, settings] = loaded
  await (settings === null
    ? logger.error('Failed to load configuration', properties, error)
    : logger.info('Loaded configuration', properties, settings))
  return loaded
}

export const ConfigurationManager = <TSettings>(properties: string[], options: Partial<GetSettingsOptions> = {}) => {
  let loaded: ServiceResponse<TSettings> | null = null
  return {
    settings: async (): Promise<TSettings> => {
      loaded = loaded ?? (await loadSettings<TSettings>(properties, options))
      const [error, settings] = loaded
      if (settings !== null) {
        return settings
      }
      throw error
    }
  }
}
