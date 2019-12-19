import fs from 'fs'
import { format, normalize } from 'path'
import { homedir } from 'os'
import { promisify } from 'util'
import logger from '@mds-core/mds-logger'
import { NotFoundError, UnsupportedTypeError } from '@mds-core/mds-utils'
import JSON5 from 'json5'

const statAsync = promisify(fs.stat)
const statFile = async (path: string): Promise<string | null> => {
  try {
    const stats = await statAsync(path)
    if (stats.isFile()) {
      return path
    }
  } catch {}
  return null
}

const getFilePath = async (property: string): Promise<string> => {
  const { MDS_CONFIG_PATH = '/mds-config' } = process.env
  const dir = MDS_CONFIG_PATH.replace('~', homedir())
  const json5 = await statFile(normalize(format({ dir, name: property, ext: '.json5' })))
  return json5 ?? normalize(format({ dir, name: property, ext: '.json' }))
}

const readFileAsync = promisify(fs.readFile)
const readFile = async (path: string): Promise<string> => {
  try {
    const utf8 = await readFileAsync(path, { encoding: 'utf8' })
    return utf8
  } catch (error) {
    throw new NotFoundError('Settings File Not Found', error)
  }
}

const readJsonFile = async <TSettings extends {}>(property: string): Promise<TSettings> => {
  const path = await getFilePath(property)
  const file = await readFile(path)
  try {
    return JSON5.parse(file)
  } catch (error) {
    throw new UnsupportedTypeError('Settings File must contain JSON', { error, path })
  }
}

export const client = {
  getSettings: async <TConfig extends {} = {}>(properties: string | string[]) => {
    const settings = await Promise.all(
      (Array.isArray(properties) ? properties : [properties]).map(property => readJsonFile(property))
    )
    return settings.reduce<TConfig>((config, setting) => Object.assign(config, setting), {} as TConfig)
  }
}

export const ConfigManager = <TConfig extends {} = {}>(properties: string | string[]) => {
  let config: TConfig | null = null
  return {
    getConfig: async (): Promise<TConfig> => {
      if (config === null) {
        config = await client.getSettings<TConfig>(properties)
        logger.info('Loaded Configuration', properties, config)
      }
      return config
    }
  }
}
