import { ApiServer, HttpServer } from '@mds-core/mds-api-server'
import { api } from '../api'

HttpServer(ApiServer(api), { port: process.env.TRANSACTION_API_HTTP_PORT })
