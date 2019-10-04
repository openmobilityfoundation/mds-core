const env = process.env
const log = require('loglevel')
const { reset_all } = require('../util/reset')

const http = require('http')
async function data_handler(type, callback) {
  log.info('Creating server...')
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = ''
      req.on('data', function(data) {
        body += data
      })
      req.on('end', function() {
        let type = req.headers['content-type']
        if (type.indexOf(';')) {
          type = type.substring(0, type.indexOf(';'))
        }

        body = JSON.parse(body)

        let ce_data = {}
        if (type === 'application/json') {
          // binary
          ce_data = {
            type: req.headers['ce-type'],
            specversion: req.headers['ce-specversion'],
            source: req.headers['ce-source'],
            id: req.headers['ce-id'],
            data: body
          }
        } else if (type === 'application/cloudevents+json') {
          // structured
          ce_data = body
        }

        callback(ce_data.type, ce_data.data)

        res.statusCode = 200
        res.end()
      })
    } else if (req.method === 'GET') {
      // TODO: MAKE SURE ADMIN PERMISSIONS ARE SETUP
      if (req.url === '/reset') {
        reset_all(type)
        res.statusCode = 200
        res.end()
      }
      res.statusCode = 404
      res.end()
    }
  })
  log.info(`listening on ${env.PORT}...`)
  server.listen(env.PORT || 4007)
}
module.exports = {
  data_handler
}
