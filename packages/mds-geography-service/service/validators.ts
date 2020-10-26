import Joi from 'joi'
import gjv from 'geojson-validation'
import { schemaValidator } from '@mds-core/mds-schema-validators'
import { GeographyDomainModel, GeographyMetadataDomainModel } from '../@types'

export const { validate: validateGeographyDomainModel, isValid: isValidGeographyDomainModel } = schemaValidator<
  GeographyDomainModel
>(
  Joi.object<GeographyDomainModel>()
    .keys({
      geography_id: Joi.string().uuid().required(),
      name: Joi.string().max(255).allow(null),
      description: Joi.string().max(255).allow(null),
      effective_date: Joi.number().integer().allow(null),
      publish_date: Joi.number().integer().allow(null),
      prev_geographies: Joi.array().items(Joi.string().uuid()).allow(null),
      geography_json: Joi.custom((geography_json, helpers) => {
        try {
          const [error] = gjv.valid(geography_json, true)
          if (error !== undefined) {
            return helpers.message({ custom: `GeoJSON is invalid ${error}` })
          }
        } catch (error) {
          return helpers.message({ custom: `GeoJSON could not be validated` })
        }
        return geography_json
      }).required()
    })
    .unknown(false)
)

export const {
  validate: validateGeographyMetadataDomainModel,
  isValid: isValidGeographyMetadataDomainModel
} = schemaValidator<GeographyMetadataDomainModel>(
  Joi.object<GeographyMetadataDomainModel>()
    .keys({
      geography_id: Joi.string().uuid().required(),
      geography_metadata: Joi.any().allow(null)
    })
    .unknown(false)
)
