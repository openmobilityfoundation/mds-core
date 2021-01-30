/**
 * Copyright 2020ß City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DomainModelCreate } from '@mds-core/mds-repository'
import { RpcServiceDefinition, RpcRoute } from '@mds-core/mds-rpc-common'
import { Nullable, UUID } from '@mds-core/mds-types'
import { SerializedBuffers } from '@mds-core/mds-backend-helpers'

/** You can either provide a list of `attachment_id` values to get each of those attachments,
 * or you can provide an `attachment_list_id` to get a group of attachments which share the same origin
 */
export type ReadAttachmentsOptions = { attachment_ids: UUID[] } | { attachment_list_id: UUID }

export interface AttachmentDomainModel {
  attachment_id: UUID
  attachment_filename: string
  base_url: string
  mimetype: string
  thumbnail_filename: Nullable<string>
  thumbnail_mimetype: Nullable<string>
  /** A way to link attachments together, intended to serve as a foreign key to the original owner.
   * E.g, if an audit has multiple attachments uploaded for it, the `attachment_list_id` for
   * each of them would be the `audit_trip_id` so they could easily be searched for.
   */
  attachment_list_id: Nullable<UUID>
}

export type AttachmentDomainCreateModel = DomainModelCreate<AttachmentDomainModel>

export interface AttachmentService {
  deleteAttachment: (attachment_id: UUID) => AttachmentDomainModel
  writeAttachment: (
    file: SerializedBuffers<Express.Multer.File>,
    attachment_list_id: Nullable<UUID>
  ) => AttachmentDomainModel
  readAttachment: (attachment_id: UUID) => AttachmentDomainModel | undefined
  readAttachments: (options: ReadAttachmentsOptions) => AttachmentDomainModel[]
}

export const AttachmentServiceDefinition: RpcServiceDefinition<AttachmentService> = {
  deleteAttachment: RpcRoute<AttachmentService['deleteAttachment']>(),
  writeAttachment: RpcRoute<AttachmentService['writeAttachment']>(),
  readAttachment: RpcRoute<AttachmentService['readAttachment']>(),
  readAttachments: RpcRoute<AttachmentService['readAttachments']>()
}
