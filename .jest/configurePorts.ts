import findPort from 'find-port-free-sync'

const randPort = () => `${findPort()}`

/**
 * Configures random ports for each API/Service
 */
const setPorts = () => {
  process.env.AGENCY_API_HTTP_PORT = randPort()

  process.env.ATTACHMENT_SERVICE_REPL_PORT = randPort()
  process.env.ATTACHMENT_SERVICE_RPC_PORT = randPort()

  process.env.AUDIT_API_HTTP_PORT = randPort()

  process.env.AUDIT_SERVICE_REPL_PORT = randPort()
  process.env.AUDIT_SERVICE_RPC_PORT = randPort()

  process.env.COLLECTOR_API_HTTP_PORT = randPort()
  process.env.COLLECTOR_BACKEND_REPL_PORT = randPort()
  process.env.COLLECTOR_BACKEND_RPC_PORT = randPort()

  process.env.COMPLIANCE_API_HTTP_PORT = randPort()
  process.env.COMPLIANCE_SERVICE_REPL_PORT = randPort()
  process.env.COMPLIANCE_SERVICE_RPC_PORT = randPort()

  process.env.GEOGRAPHY_API_HTTP_PORT = randPort()
  process.env.GEOGRAPHY_AUTHOR_API_HTTP_PORT = randPort()
  process.env.GEOGRAPHY_SERVICE_RPC_PORT = randPort()
  process.env.GEOGRAPHY_SERVICE_REPL_PORT = randPort()

  process.env.JURISDICTION_API_HTTP_PORT = randPort()
  process.env.JURISDICTION_SERVICE_REPL_PORT = randPort()
  process.env.JURISDICTION_SERVICE_RPC_PORT = randPort()

  process.env.POLICY_API_HTTP_PORT = randPort()
  process.env.POLICY_AUTHOR_API_HTTP_PORT = randPort()
  process.env.POLICY_SERVICE_REPL_PORT = randPort()
  process.env.POLICY_SERVICE_RPC_PORT = randPort()

  process.env.INGEST_SERVICE_RPC_PORT = randPort()
  process.env.INGEST_SERVICE_REPL_PORT = randPort()

  process.env.TRANSACTION_API_HTTP_PORT = randPort()
  process.env.TRANSACTION_SERVICE_REPL_PORT = randPort()
  process.env.TRANSACTION_SERVICE_RPC_PORT = randPort()

  console.log('Configured random ports!')
}

setPorts()
