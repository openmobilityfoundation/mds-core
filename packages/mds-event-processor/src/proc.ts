const env = process.env
import db from '@mds-core/mds-db'
import cache from '@mds-core/mds-cache'
import http from 'http'

async function reset_all(type: string) {
  // cache related
  if (type === 'event') {
    await cache.delCache('device:state')
  } else if (type === 'trip') {
    await cache.delCache('trip:state')
    await cache.delMatch('device:*:trips')
  }

  // database related
  await db.initialize()
  if (type === 'event') {
    await db.resetTable('reports_device_states')
  } else if (type === 'trip') {
    await db.resetTable('reports_trips')
  }
}

async function data_handler(
  type: string,
  callback: { (type: any, data: any): Promise<any>; (arg0: any, arg1: any): void }
) {
  console.log('Creating server...')
  const server = http.createServer((req: any, res: any) => {
    if (req.method === 'POST') {
      console.log('Received POST')
      let body: string
      body = ''
      req.on('data', function(data: string) {
        body += data
      })
      req.on('end', function() {
        let type = req.headers['content-type']
        if (type.indexOf(';') >= 0) {
          type = type.substring(0, type.indexOf(';'))
        }

        let parsed_body: any
        parsed_body = JSON.parse(body)

        let ce_data: { [x: string]: any } = {}
        if (type === 'application/json') {
          // binary
          ce_data = {
            type: req.headers['ce-type'],
            specversion: req.headers['ce-specversion'],
            source: req.headers['ce-source'],
            id: req.headers['ce-id'],
            data: parsed_body
          }
        } else if (type === 'application/cloudevents+json') {
          // structured
          ce_data = parsed_body
        }

        callback(ce_data.type, ce_data.data)

        res.statusCode = 200
        res.end()
      })
    } else if (req.method === 'GET') {
      // TODO: MAKE SURE ADMIN PERMISSIONS ARE SETUP
      if (req.url === '/reset') {
        reset_all(type)
        console.log('done resetting')
        res.statusCode = 200
        res.end()
      }
      res.statusCode = 404
      res.end()
    }
  })
  console.log(`listening on ${env.PORT}...`)
  server.listen(env.PORT || 4007)
}
export { data_handler }
