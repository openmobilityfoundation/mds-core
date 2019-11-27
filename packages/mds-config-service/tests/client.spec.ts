import test from 'unit.js'
import { NotFoundError } from '@mds-core/mds-utils'
import client from '../index'

describe('Test Config Client', () => {
  it('Missing Settings File', async () => {
    try {
      const settings = await client.getSettings()
      test.value(settings).is(null)
    } catch (error) {
      test.value(error instanceof NotFoundError).is(true)
    }
  })

  it('Parse Settings File', async () => {
    process.env.MDS_CONFIG_PATH = './'
    const settings = await client.getSettings<{ name: string }>('package')
    test.value(settings).isNot(null)
    test.value(settings.name).is('@mds-core/mds-config-service')
  })
})
