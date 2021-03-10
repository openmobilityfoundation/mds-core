/**
 * Copyright 2020 City of Los Angeles
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

import { ServiceProvider, ProcessController, ServiceResult, ServiceException } from '@mds-core/mds-service-helpers'
import logger from '@mds-core/mds-logger'
import { GeographyService } from '../@types'
import { GeographyRepository } from '../repository'
import {
  validateGeographyDomainCreateModel,
  validateGeographyMetadataDomainCreateModel,
  validateGetGeographiesOptions,
  validateGetPublishedGeographiesOptions
} from './validators'

export const GeographyServiceProvider: ServiceProvider<GeographyService> & ProcessController = {
  start: GeographyRepository.initialize,
  stop: GeographyRepository.shutdown,

  getGeographies: async options => {
    try {
      const geographies = await GeographyRepository.getGeographies(validateGetGeographiesOptions(options ?? {}))
      return ServiceResult(geographies)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Getting Geographies', error)
      logger.error('mds-geography-service::getGeographies error', { exception, error })
      return exception
    }
  },

  getUnpublishedGeographies: async options => {
    try {
      const geographies = await GeographyRepository.getUnpublishedGeographies(
        validateGetGeographiesOptions(options ?? {})
      )
      return ServiceResult(geographies)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Getting Unpublished Geographies', error)
      logger.error('mds-geography-service::getUnpublishedGeographies error', { exception, error })
      return exception
    }
  },

  getPublishedGeographies: async options => {
    try {
      const geographies = await GeographyRepository.getPublishedGeographies(
        validateGetPublishedGeographiesOptions(options ?? {})
      )
      return ServiceResult(geographies)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Getting Published Geographies', error)
      logger.error('mds-geography-service::getPublishedGeographies error', { exception, error })
      return exception
    }
  },

  getGeography: async (geography_id, options) => {
    try {
      const geography = await GeographyRepository.getGeography(
        geography_id,
        validateGetGeographiesOptions(options ?? {})
      )
      return ServiceResult(geography)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Getting Geography', error)
      logger.error('mds-geography-service::getGeography error', { exception, error })
      return exception
    }
  },

  writeGeographies: async models => {
    try {
      const geographies = await GeographyRepository.writeGeographies(models.map(validateGeographyDomainCreateModel))
      return ServiceResult(geographies)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Writing Geographies', error)
      logger.error('mds-geography-service::writeGeographies error', { exception, error })
      return exception
    }
  },

  writeGeographiesMetadata: async models => {
    try {
      const metadata = await GeographyRepository.writeGeographiesMetadata(
        models.map(validateGeographyMetadataDomainCreateModel)
      )
      return ServiceResult(metadata)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Writing Geographies Metadata', error)
      logger.error('mds-geography-service::writeGeographiesMetadata error', { exception, error })
      return exception
    }
  }
}
