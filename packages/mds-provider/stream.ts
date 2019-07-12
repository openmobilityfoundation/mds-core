import yargs from 'yargs'
import { ProviderEventProcessor, ProviderEventProcessorOptions } from './event-processor'

const {
  _: [command],
  count,
  interval
}: ProviderEventProcessorOptions & { _: string[] } = yargs
  .command('start', 'Start the event processor', args =>
    args.options({
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
  )
  .help()
  .alias('h', 'help')
  .strict().argv

if (command === 'start') {
  ProviderEventProcessor({ interval, count })
}
