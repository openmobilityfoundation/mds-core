import { IngestRepository } from './repository'

// Make connection options available to TypeORM CLI
module.exports = IngestRepository.cli({ migrationsDir: 'repository/migrations' })
