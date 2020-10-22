import { AttachmentRepository } from './repository'

// Make connection options available to TypeORM CLI
module.exports = AttachmentRepository.cli({ migrationsDir: 'repository/migrations' })
