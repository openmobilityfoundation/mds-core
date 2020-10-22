import { PolicyRepository } from './repository'

// Make connection options available to TypeORM CLI
module.exports = PolicyRepository.cli({ migrationsDir: 'repository/migrations' })
