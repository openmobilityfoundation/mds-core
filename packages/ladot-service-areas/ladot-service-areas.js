const laCityBoundary = require('./la-city-boundary')
const restrictedAreas = require('./restricted-areas')
const laDacs = require('./la-dacs')
const veniceSpecOps = require('./venice-special-ops-zone')

// FIXME move into DB eventually

const serviceAreaMap = {
  // LA city boundary
  '1f943d59-ccc9-4d91-b6e2-0c5e771cbc49': {
    start_date: 0,
    end_date: null,
    prev_area: null,
    replacement_area: null,
    type: 'unrestricted',
    description: 'Los Angeles',
    area: laCityBoundary.features[0].geometry
  },

  // "Special Ops Zone"
  'e0e4a085-7a50-43e0-afa4-6792ca897c5a': {
    start_date: 0,
    end_date: null,
    prev_area: null,
    replacement_area: null,
    type: 'restricted',
    description: 'Venice Beach Special Operations Zone',
    area: veniceSpecOps.features[0].geometry
  },

  // beach
  'ff822e26-a70c-4721-ac32-2f6734beff9b': {
    start_date: 0,
    end_date: null,
    prev_area: null,
    replacement_area: null,
    type: 'restricted',
    description: 'The Beach',
    area: restrictedAreas.features[0].geometry
  },

  // canals
  '43f329fc-335a-4495-b542-6b516def9269': {
    start_date: 0,
    end_date: null,
    prev_area: null,
    replacement_area: null,
    type: 'restricted',
    description: 'The Canals',
    area: restrictedAreas.features[1].geometry
  },

  // San Fernando Valley DAC
  'e3ed0a0e-61d3-4887-8b6a-4af4f3769c14': {
    start_date: 0,
    end_date: null,
    prev_area: null,
    replacement_area: null,
    type: 'unrestricted',
    description: 'San Fernando Valley DAC',
    area: laDacs.features[1].geometry
  },

  // Non San Fernando Valley DAC
  '0c444869-1674-4234-b4f3-ab5685bcf0d9': {
    start_date: 0,
    end_date: null,
    prev_area: null,
    replacement_area: null,
    type: 'unrestricted',
    description: 'Non San Fernando Valley DAC',
    area: laDacs.features[0].geometry
  }
}

function readServiceAreas(provider_id, service_area_id) {
  // ignore provider_id for now
  return new Promise(resolve => {
    // see if service_area_id is non-null
    // log.info('readServiceAreas', provider_id, '"' + service_area_id + '"')

    if (typeof service_area_id === 'string') {
      const service_area_record = serviceAreaMap[service_area_id]
      if (service_area_record) {
        service_area_record.service_area_id = service_area_id
        // log.info('found one')
        resolve([service_area_record])
      } else {
        // log.info('did not find one')
        resolve(null) // womp womp
      }
    } else {
      const areas = Object.keys(serviceAreaMap).map(key => {
        const service_area_record = serviceAreaMap[key]
        service_area_record.service_area_id = key
        return service_area_record
      })
      // log.info('returning all ' + areas.length + ' areas for ' + Object.keys(serviceAreaMap))
      resolve(areas)
    }
  })
}

module.exports = {
  readServiceAreas,
  serviceAreaMap
}
