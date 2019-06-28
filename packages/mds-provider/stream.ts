import yargs from 'yargs'

import { seconds } from 'mds-utils'
import { ProviderEventProcessor, ProviderEventProcessorOptions } from './event-processor'

type CommandLineOptions = ProviderEventProcessorOptions & Partial<{ interval: number }>

const main = async () => {
  const args: CommandLineOptions = yargs
    .options({
      block: {
        alias: 'b',
        describe: 'The number of seconds to wait for events (0: forever)',
        type: 'number'
      },
      count: {
        alias: 'c',
        describe: 'The number of events to process',
        type: 'number',
        default: 1000
      },
      interval: {
        alias: 'i',
        describe: 'The number of seconds to wait between function executions (0: run once)',
        type: 'number',
        default: 15
      }
    })
    .help()
    .alias('h', 'help')
    .strict().argv

  const { count, block, interval } = args
  const options = { count, ...(block ? { block: seconds(block) } : {}) }

  await ProviderEventProcessor(options)
  if (interval && interval > 0) {
    setInterval(async () => {
      await ProviderEventProcessor(options)
    }, seconds(interval))
  }
}

main()
