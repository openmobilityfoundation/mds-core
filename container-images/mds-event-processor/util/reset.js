const env = process.env

let { delCache, delMatch } = require('./cache')
let { setup, reset } = require('./db')

const log = require('loglevel')

/*
 * only reset relevant streams / tables depending on the key
 */
async function reset_all(key) {
  // redis related
  if (key === 'event') {
    await delCache('device:state')
  } else if (key === 'trip') {
    await delCache('trip:state')
    await delMatch('device:*:trips')
  }

  // database related
  await setup()
  if (key === 'event') {
    await reset('device_states')
  } else if (key === 'trip') {
    await reset('trips')
  }

  log.info('done resetting')
}

module.exports = {
  reset_all
}