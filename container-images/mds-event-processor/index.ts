import { event_handler } from './src/proc-event'
import { trip_handler } from './src/proc-trip'
//const provider_handler = __importDefault(require("./src/proc-provider"))
import { setup } from './util/db'

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
  console.log('INIT')
  switch (type) {
    case 'event':
      console.log('EVENT')
      await event_handler()
      break
    case 'trip':
      console.log('TRIP')
      await trip_handler()
      break
    /*
      case 'provider':
      console.log('PROVIDER')
      await provider_handler()
      break
    */
  }
}

let args = getArgs()
if (args['type']) {
  process_data(args['type'])
} else {
  console.error('no type specified!')
}
