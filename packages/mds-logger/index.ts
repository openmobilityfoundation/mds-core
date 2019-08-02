/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

// Sorry about all the `any` type declarations, but log messages can be
// arbitrarily nested JS objects.

/* eslint no-console: "off" */

import PushClient from 'pushover-notifications'

import { WebClient as SlackClient } from '@slack/client'

require('dotenv').config()

const { env } = process

interface Datum {
  lat?: string
  lng?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [propName: string]: any
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pushClient: any

if (env.PUSHOVER_TOKEN) {
  pushClient = new PushClient({
    user: env.PUSHOVER_USER,
    token: env.PUSHOVER_TOKEN,
    debug: true
  })
}

async function sendPush(msg: string, priority?: number) {
  if (!pushClient) {
    return
  }
  const payload = {
    // These values correspond to the parameters detailed on https://pushover.net/api
    // 'message' is required. All other values are optional.
    message: msg, // required
    // title: 'Test Pushover',
    // sound: 'magic',
    // device: 'devicename',
    priority: priority || 0
  }

  const [err, result] = await pushClient.send(payload)
  if (err) {
    console.error('ERROR pushover fail', err)
    throw err
  } else {
    console.log('INFO pushover success', result)
    return result
  }
}

function makeCensoredDatum(datum: Datum) {
  if (datum instanceof Error) {
    return datum.toString()
  }
  const censoredDatum: Datum = { ...datum }
  if (censoredDatum.lat != null) {
    censoredDatum.lat = 'CENSORED_LAT'
  }
  if (censoredDatum.lng != null) {
    censoredDatum.lng = 'CENSORED_LNG'
  }
  return censoredDatum
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAtomic(item: any) {
  const type = typeof item
  return ['string', 'number', 'boolean', 'undefined'].includes(type) || item == null
}

// just in case we have to censor something nested like
// { data: [{ lat:1, lng:2 }] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeCensoredLogMsgRecurse(msg: any): any {
  if (isAtomic(msg)) {
    return msg
  }
  if (Array.isArray(msg)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return msg.map((arr_item: any) => makeCensoredLogMsgRecurse(arr_item))
  }
  const censoredObject = makeCensoredDatum(msg)
  if (typeof censoredObject === 'object') {
    Object.keys(censoredObject).forEach((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val: any = censoredObject[key]
      if (!isAtomic(val)) {
        censoredObject[key] = makeCensoredLogMsgRecurse(val)
      }
    })
  }
  return censoredObject
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeCensoredLogMsg(...msgs: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return makeCensoredLogMsgRecurse(msgs).map((item: any) =>
    // never print out '[object Object]'
    String(item) === '[object Object]' ? JSON.stringify(item) : item
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let slackClient: any = null
if (env.SLACK_TOKEN) {
  // An access token (from your Slack app or custom integration - xoxa, xoxp, or xoxb)
  slackClient = new SlackClient(env.SLACK_TOKEN)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendSlack(msg: any, channelParam?: string) {
  if (!slackClient) {
    return
  }

  // See: https://api.slack.com/methods/chat.postMessage
  const channel = channelParam || env.SLACK_CHANNEL || '#sandbox'
  console.log('INFO sendSlack', channel, msg)
  try {
    const res = await slackClient.chat.postMessage({
      // This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
      token: env.SLACK_TOKEN,
      channel,
      text: msg
    })

    // `res` contains information about the posted message
    // eslint-disable-next-line no-console
    console.log('INFO slack message sent: ', res.ts)
    return res.ts
  } catch (err) {
    console.error('ERROR slack message fail: ', err)
    throw err
  }
}

const { argv } = process

if (argv.length > 3) {
  const verb = argv[2]
  if (verb === 'slack') {
    if (env.SLACK_TOKEN) {
      /* eslint-reason can't use async/await in non-function */
      /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
      sendSlack(argv[3])
    } else {
      console.error('no SLACK_TOKEN defined')
    }
  } else if (verb === 'push') {
    if (env.PUSHOVER_TOKEN) {
      /* eslint-reason can't use async/await in non-function */
      /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
      sendPush(argv[3])
    } else {
      console.error('no PUSHOVER_TOKEN defined')
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function info(...msg: any[]): any[] {
  if (env.QUIET) {
    return []
  }

  const censoredMsg = makeCensoredLogMsg(...msg)
  console.log.apply(console, ['INFO', ...censoredMsg])
  return censoredMsg
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function warn(...msg: any[]): Promise<any[]> {
  if (env.QUIET) {
    return []
  }

  const censoredMsg = makeCensoredLogMsg(...msg)
  console.log.apply(console, ['WARN', ...censoredMsg])
  /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
  await sendSlack(censoredMsg.join(' '))

  /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
  await sendPush(censoredMsg.join(' '), 0)
  return censoredMsg
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function error(...msg: any[]): Promise<any[]> {
  if (env.QUIET) {
    return []
  }
  const censoredMsg = makeCensoredLogMsg(...msg)
  // eslint-disable-next-line no-console
  console.error.apply(console, ['ERROR', ...censoredMsg])

  await sendSlack(censoredMsg.join(' '))
  await sendPush(censoredMsg.join(' '), 1)
  return censoredMsg
}

async function startup() {
  // try {
  // 	if (env.PUSHOVER_TOKEN) {
  // 		console.log('INFO sending startup pushover: ' + msg)
  // 	}
  // 	if (env.SLACK_TOKEN) {
  // 		console.log('INFO sending startup slack: ' + msg)
  // 	}
  // } catch (err) {
  // 	console.error('ERROR failed to send startup message(s)', err.stack)
  // }
}

export default { info, warn, error, startup }
