import test from 'unit.js'
import { NotFoundError } from '@mds-core/mds-utils'
import { client, ConfigurationManager } from '../client'

const { MDS_CONFIG_PATH } = process.env

describe('Test Config Client', () => {
  before(() => {
    process.env.MDS_CONFIG_PATH = './'
  })

  it('Single Settings File (missing)', async () => {
    try {
      const settings = await client.getSettings('missing')
      test.value(settings).is(null)
    } catch (error) {
      test.value(error instanceof NotFoundError).is(true)
    }
  })

  it('Single Settings File', async () => {
    const settings = await client.getSettings<{ name: string }>('package')
    test.value(settings).isNot(null)
    test.value(settings.name).is('@mds-core/mds-config-service')
  })

  it('Multiple Settings File (missing)', async () => {
    try {
      const settings = await client.getSettings(['package', 'missing'])
      test.value(settings).is(null)
    } catch (error) {
      test.value(error instanceof NotFoundError).is(true)
    }
  })

  it('Multiple Settings File', async () => {
    const config = await client.getSettings<{ name?: string; compilerOptions?: { outDir?: string } }>([
      'package',
      'tsconfig.build'
    ])
    test.value(config).isNot(null)
    test.value(config.name).is('@mds-core/mds-config-service')
    test.value(config.compilerOptions?.outDir).is('dist')
  })

  it('Config Manager', async () => {
    const config = await ConfigurationManager<{ name?: string; compilerOptions?: { outDir?: string } }>([
      'package',
      'tsconfig.build'
    ]).configuration()
    test.value(config).isNot(null)
    test.value(config.name).is('@mds-core/mds-config-service')
    test.value(config.compilerOptions?.outDir).is('dist')
  })

  after(() => {
    process.env.MDS_CONFIG_PATH = MDS_CONFIG_PATH
  })
})
