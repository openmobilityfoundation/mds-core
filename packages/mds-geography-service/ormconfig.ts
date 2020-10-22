import { GeographyRepository } from './repository'

// Make connection options available to TypeORM CLI
module.exports = GeographyRepository.cli({ migrationsDir: 'repository/migrations' })
