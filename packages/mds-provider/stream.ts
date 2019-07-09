import yargs from 'yargs'

import { ProviderEventProcessor, ProviderEventProcessorOptions } from './event-processor'

const { block, count, interval }: ProviderEventProcessorOptions = yargs
  .options({
    block: {
      alias: 'b',
      describe: 'The number of milliseconds to wait for events (0: forever)',
      type: 'number'
    },
    count: {
      alias: 'c',
      describe: 'The number of events to process per iteration',
      type: 'number'
    },
    interval: {
      alias: 'i',
      describe: 'The number of milliseconds to wait between iterations (0: run once)',
      type: 'number'
    }
  })
  .help()
  .alias('h', 'help')
  .strict().argv

ProviderEventProcessor({ count, block, interval })
