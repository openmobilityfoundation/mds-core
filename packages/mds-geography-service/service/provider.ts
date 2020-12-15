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
      logger.error(exception, error)
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
      logger.error(exception, error)
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
      logger.error(exception, error)
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
      logger.error(exception, error)
      return exception
    }
  },

  writeGeographies: async models => {
    try {
      const geographies = await GeographyRepository.writeGeographies(models.map(validateGeographyDomainCreateModel))
      return ServiceResult(geographies)
    } catch (error) /* istanbul ignore next */ {
      const exception = ServiceException('Error Writing Geographies', error)
      logger.error(exception, error)
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
      logger.error(exception, error)
      return exception
    }
  }
}
