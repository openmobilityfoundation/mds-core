import { AuditRepository } from './repository'

// Make connection options available to TypeORM CLI
module.exports = AuditRepository.cli({ migrationsDir: 'repository/migrations' })
