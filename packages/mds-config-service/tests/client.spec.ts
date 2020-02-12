import test from 'unit.js'
import { NotFoundError } from '@mds-core/mds-utils'
import { client, ConfigurationManager } from '../client'

const { MDS_CONFIG_PATH } = process.env

describe('Test Config Client', () => {
  before(() => {
    process.env.MDS_CONFIG_PATH = './'
  })

  it('Single Settings File (missing)', async () => {
    const [error, settings] = await client.getSettings(['missing'])
    test.value(error instanceof NotFoundError).is(true)
    test.value(settings).is(null)
  })

  it('Single Settings File (partial)', async () => {
    const [error, settings] = await client.getSettings<{ missing?: unknown }>(['missing'], { partial: true })
    test.value(error).is(null)
    test.value(settings).isNot(null)
    test.value(settings?.missing).is(null)
  })

  it('Single Settings File', async () => {
    const [error, settings] = await client.getSettings<{ name?: string }>(['package'])
    test.value(error).is(null)
    test.value(settings).isNot(null)
    test.value(settings?.name).is('@mds-core/mds-config-service')
  })

  it('Multiple Settings File (missing)', async () => {
    const [error, settings] = await client.getSettings(['package', 'missing'])
    test.value(error instanceof NotFoundError).is(true)
    test.value(settings).is(null)
  })

  it('Multiple Settings File (partial)', async () => {
    const [error, settings] = await client.getSettings<{ name?: string; missing?: unknown }>(['package', 'missing'], {
      partial: true
    })
    test.value(error).is(null)
    test.value(settings).isNot(null)
    test.value(settings?.name).is('@mds-core/mds-config-service')
    test.value(settings?.missing).is(null)
  })

  it('Multiple Settings File', async () => {
    const [error, settings] = await client.getSettings<{ name?: string; compilerOptions?: { outDir?: string } }>([
      'package',
      'tsconfig.build'
    ])
    test.value(error).is(null)
    test.value(settings).isNot(null)
    test.value(settings?.name).is('@mds-core/mds-config-service')
    test.value(settings?.compilerOptions?.outDir).is('dist')
  })

  it('Config Manager (missing)', async () => {
    let caught: Error | null = null
    try {
      await ConfigurationManager<{ name?: string; compilerOptions?: { outDir?: string } }>(['missing']).settings()
    } catch (error) {
      caught = error
    }
    test.value(caught instanceof NotFoundError).is(true)
  })

  it('Config Manager (partial)', async () => {
    const settings = await ConfigurationManager<{ name?: string; missing?: unknown }>(['package', 'missing'], {
      partial: true
    }).settings()
    test.value(settings).isNot(null)
    test.value(settings.name).is('@mds-core/mds-config-service')
    test.value(settings.missing).is(null)
  })

  it('Config Manager', async () => {
    const settings = await ConfigurationManager<{ name?: string; compilerOptions?: { outDir?: string } }>([
      'package',
      'tsconfig.build'
    ]).settings()
    test.value(settings).isNot(null)
    test.value(settings.name).is('@mds-core/mds-config-service')
    test.value(settings.compilerOptions?.outDir).is('dist')
  })

  after(() => {
    process.env.MDS_CONFIG_PATH = MDS_CONFIG_PATH
  })
})
