import { TransactionRepository } from './repository'

// Make connection options available to TypeORM CLI
module.exports = TransactionRepository.cli({ migrationsDir: 'repository/migrations' })
