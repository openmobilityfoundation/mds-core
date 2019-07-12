/*
    Copyright 2019 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import logger from 'mds-logger'
import { providers, isProviderId } from 'mds-providers'
import { Provider, UUID } from 'mds'
import { isUUID } from 'mds-utils'
import { StreamEntry, StreamEntryLabels } from '../types'

export interface ProviderLabel {
  provider: Provider
}

type ProviderStreamEntry = StreamEntry<{ provider_id: UUID }>

export const isProviderEntry = (entry: StreamEntry): entry is ProviderStreamEntry =>
  entry &&
  typeof entry === 'object' &&
  typeof entry.data === 'object' &&
  isUUID((entry as ProviderStreamEntry).data.provider_id)

export const ProviderLabeler = async (entries: StreamEntry[]): Promise<StreamEntryLabels<ProviderLabel>> => {
  const provider_entries = entries.filter(isProviderEntry)

  if (provider_entries.length > 0) {
    // Get unique provider ids from all entries
    const provider_ids = [...new Set(provider_entries.map(entry => entry.data.provider_id).filter(isProviderId))]

    // Create a provider map
    const provider_map = provider_ids.reduce<{ [provider_id: string]: Provider }>(
      (map, provider_id) => ({ ...map, [provider_id]: providers[provider_id] }),
      {}
    )

    // Create the provider labels
    const { labels, labeled } = provider_entries.reduce(
      (result, entry) => {
        const provider = provider_map[entry.data.provider_id]
        return {
          labels: { ...result.labels, [entry.id]: { provider } },
          labeled: provider ? result.labeled + 1 : result.labeled
        }
      },
      { labels: {}, labeled: 0 }
    )

    logger.info(
      `|- Provider Labeler: Labeled ${labeled} ${labeled === 1 ? 'entry' : 'entries'} (${provider_ids.length} ${
        provider_ids.length === 1 ? 'provider' : 'providers'
      })`
    )

    return labels
  }

  return {}
}
