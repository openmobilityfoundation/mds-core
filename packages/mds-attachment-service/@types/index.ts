import { DomainModelCreate } from '@mds-core/mds-repository'
import { RpcServiceDefinition, RpcRoute } from '@mds-core/mds-rpc-common'
import { Nullable, UUID } from '@mds-core/mds-types'

export interface AttachmentDomainModel {
  attachment_id: UUID
  attachment_filename: string
  base_url: string
  mimetype: string
  thumbnail_filename: Nullable<string>
  thumbnail_mimetype: Nullable<string>
}

export type AttachmentDomainCreateModel = DomainModelCreate<AttachmentDomainModel>

export interface AttachmentService {
  name: () => string
}

export const AttachmentServiceDefinition: RpcServiceDefinition<AttachmentService> = {
  name: RpcRoute<AttachmentService['name']>()
}
