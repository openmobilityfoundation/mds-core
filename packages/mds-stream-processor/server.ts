/* eslint-disable no-console */
import { VehicleEventProcessor } from './processors'

const {
  env: { npm_package_name, npm_package_version, npm_package_git_commit, KAFKA_HOST }
} = process

VehicleEventProcessor.run()
  .then(() => {
    console.log(
      `Running ${npm_package_name} v${npm_package_version} (${
        npm_package_git_commit ?? 'local'
      }) connected to ${KAFKA_HOST}`
    )
    return 0
  })
  .catch(error => {
    console.log(
      `${npm_package_name} v${npm_package_version} (${npm_package_git_commit}) connected to ${KAFKA_HOST} failed to start`,
      error
    )
    return 1
  })
