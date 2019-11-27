import fs from 'fs'
import { promisify } from 'util'
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

const getFilePath = async (name = 'settings'): Promise<string> => {
  const { MDS_CONFIG_PATH = '/mds-config' } = process.env
  const path = MDS_CONFIG_PATH.endsWith('/') ? MDS_CONFIG_PATH : `${MDS_CONFIG_PATH}/`
  const json5 = await statFile(`${path}${name}.json5`)
  return json5 ?? `${path}${name}.json`
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

const asJson = <TSettings extends object>(utf8: string): TSettings => {
  try {
    const json: TSettings = JSON5.parse(utf8)
    return json
  } catch (error) {
    throw new UnsupportedTypeError('Settings File must contain JSON', error)
  }
}

export const getSettings = async <TSettings extends object>(name?: string): Promise<TSettings> => {
  const path = await getFilePath(name)
  const file = await readFile(path)
  return asJson<TSettings>(file)
}
