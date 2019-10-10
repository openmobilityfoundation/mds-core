export {}
let { event_handler } = require('./src/proc-event.js')
let { trip_handler } = require('./src/proc-trip.js')
let { provider_handler } = require('./src/proc-provider')
let { setup } = require('./util/db')
const log = require('loglevel')
log.setLevel('trace') // TODO, make env var?

function getArgs() {
  let args: { [x: string]: any } = {}
  process.argv.slice(2, process.argv.length).forEach(arg => {
    // long arg
    if (arg.slice(0, 2) === '--') {
      const longArg = arg.split('=')
      const longArgFlag = longArg[0].slice(2, longArg[0].length)
      const longArgValue = longArg.length > 1 ? longArg[1] : true
      args[longArgFlag] = longArgValue
    } else if (arg[0] === '-') {
      // flags
      const flags = arg.slice(1, arg.length).split('')
      flags.forEach(flag => {
        args[flag] = true
      })
    }
  })
  return args
}

async function process_data(type: string) {
  // just make sure the tables exist
  await setup()
  log.info('INIT')
  switch (type) {
    case 'event':
      log.info('EVENT')
      await event_handler()
      break
    case 'trip':
      log.info('TRIP')
      await trip_handler()
      break
    case 'provider':
      log.info('PROVIDER')
      await provider_handler()
      break
  }
}

let args = getArgs()
if (args['type']) {
  process_data(args['type'])
} else {
  console.error('no type specified!')
}
