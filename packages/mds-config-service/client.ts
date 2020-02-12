import fs from 'fs'
import { format, normalize } from 'path'
import { homedir } from 'os'
import { promisify } from 'util'
import logger from '@mds-core/mds-logger'
import { NotFoundError, UnsupportedTypeError } from '@mds-core/mds-utils'
import JSON5 from 'json5'

type GetSettingsSuccess<TSettings extends {}> = [null, TSettings]
const Success = <TSettings extends {}>(result: TSettings): GetSettingsSuccess<TSettings> => [null, result]

type GetSettingsFailure = [Error, null]
const Failure = (error: Error): GetSettingsFailure => [error, null]

type GetSettingsResult<TSettings extends {}> = GetSettingsSuccess<TSettings> | GetSettingsFailure

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

const readJsonFile = async <TSettings extends {}>(property: string): Promise<GetSettingsResult<TSettings>> => {
  try {
    const json5 = await readFile(getFilePath(property, '.json5'))
    return Success(
      parseJson<TSettings>(json5, { parser: JSON5 })
    )
  } catch {
    try {
      const json = await readFile(getFilePath(property, '.json'))
      return Success(parseJson<TSettings>(json))
    } catch (error) {
      return Failure(error)
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
  ): Promise<GetSettingsResult<TSettings>> => {
    const settings = await Promise.all(properties.map(property => readJsonFile<TSettings>(property)))
    const result = settings.reduce<{ found: string[]; missing: string[] }>(
      (info, [error], index) =>
        error
          ? { ...info, missing: [...info.missing, properties[index]] }
          : { ...info, found: [...info.found, properties[index]] },
      { found: [], missing: [] }
    )
    return result.missing.length > 0 && !partial
      ? Failure(new NotFoundError('Settings Not Found', result))
      : Success(
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
): Promise<GetSettingsResult<TSettings>> => {
  const loaded = await client.getSettings<TSettings>(properties, options)
  const [error, settings] = loaded
  await (settings === null
    ? logger.error('Failed to load configuration', properties, error)
    : logger.info('Loaded configuration', properties, settings))
  return loaded
}

export const ConfigurationManager = <TSettings>(properties: string[], options: Partial<GetSettingsOptions> = {}) => {
  let loaded: GetSettingsResult<TSettings> | null = null
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
