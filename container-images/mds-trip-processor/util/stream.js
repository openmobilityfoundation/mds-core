const env = process.env

let Cloudevent = require('cloudevents-sdk')

let binding = null

function getBinding() {
  if (!binding) {
    let config = {
      method: 'POST',
      url: env.SINK
    }

    // The binding instance
    binding = new Cloudevent.bindings['http-binary0.2'](config) // eslint-disable-line 
  }

  return binding
}

async function seed(devices, events) {
  for (let device_index in devices) {
    add('devices', 'mds.device', devices[device_index])
  }
  for (let event_index in events) {
    add('events', 'mds.event', events[event_index])
  }
}

async function add(client_name, key, value) {
  let cloudevent = new Cloudevent(Cloudevent.specs['0.2'])
    .type(key)
    .source(env.CE_NAME)
    .data(JSON.stringify(value))

  getBinding().emit(cloudevent)
}

module.exports = {
  seed,
  add
}