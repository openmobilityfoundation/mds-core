import { FeatureCollection } from 'geojson'

export default {
  type: 'FeatureCollection',
  crs: { type: 'name', properties: { name: 'EPSG:4326' } },
  features: [
    {
      type: 'Feature',
      id: 0,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-118.4834981, 33.9959323000001, 0],
            [-118.4817922, 33.996973, 0],
            [-118.4812558, 33.9964127000001, 0],
            [-118.476696, 33.9988765000001, 0],
            [-118.4706986, 33.9918494, 0],
            [-118.4704626, 33.9915025, 0],
            [-118.4644651, 33.9899013, 0],
            [-118.4574163, 33.9848128, 0],
            [-118.4634244, 33.9810140000001, 0],
            [-118.4546483, 33.9697502000001, 0],
            [-118.4547985, 33.9696879000001, 0],
            [-118.4529638, 33.966894, 0],
            [-118.4572446, 33.9648919000001, 0],
            [-118.4834981, 33.9959323000001, 0]
          ]
        ]
      },
      properties: {
        OID: 1,
        Name: 'Venice Special Operation Area',
        FolderPath: 'Venice Dockless Drop Zones/Special Operation Area',
        SymbolID: 0,
        AltMode: 0,
        Base: 0,
        Clamped: -1,
        Extruded: 0,
        Snippet: '',
        PopupInfo:
          'Within this area, operators may not stage dockless mobility devices outside of a designated drop zone.'
      }
    },
    {
      type: 'Feature',
      id: 1,
      geometry: { type: 'Point', coordinates: [-118.4791601, 33.9974981, 0] },
      properties: {
        OID: 1,
        Name: '1 Navy/Main',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/1 Navy'
      }
    },
    {
      type: 'Feature',
      id: 2,
      geometry: {
        type: 'Point',
        coordinates: [-118.478951, 33.9974267000001, 0]
      },
      properties: {
        OID: 2,
        Name: '2 Navy/Main',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/2 Navy'
      }
    },
    {
      type: 'Feature',
      id: 3,
      geometry: {
        type: 'Point',
        coordinates: [-118.4784907, 33.9958044000001, 0]
      },
      properties: {
        OID: 3,
        Name: '3 Rose/Pacific',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/3 Rose'
      }
    },
    {
      type: 'Feature',
      id: 4,
      geometry: { type: 'Point', coordinates: [-118.478164, 33.9958346, 0] },
      properties: {
        OID: 4,
        Name: '4 Rose/S Main',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/4 Rose'
      }
    },
    {
      type: 'Feature',
      id: 5,
      geometry: {
        type: 'Point',
        coordinates: [-118.4802485, 33.9948739000001, 0]
      },
      properties: {
        OID: 5,
        Name: '5 Rose/Speedway',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/5 Rose'
      }
    },
    {
      type: 'Feature',
      id: 6,
      geometry: { type: 'Point', coordinates: [-118.4801472, 33.9947716, 0] },
      properties: {
        OID: 6,
        Name: '6 Rose/Speedway',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/6 Rose'
      }
    },
    {
      type: 'Feature',
      id: 7,
      geometry: {
        type: 'Point',
        coordinates: [-118.476222, 33.9946029000001, 0]
      },
      properties: {
        OID: 7,
        Name: '7 Sunset/Main',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/7 Sunset'
      }
    },
    {
      type: 'Feature',
      id: 8,
      geometry: {
        type: 'Point',
        coordinates: [-118.4741838, 33.9924868000001, 0]
      },
      properties: {
        OID: 8,
        Name: '8 Abbot Kinney/Main',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/8 Abbot Kinney'
      }
    },
    {
      type: 'Feature',
      id: 9,
      geometry: { type: 'Point', coordinates: [-118.4724762, 33.9900398, 0] },
      properties: {
        OID: 9,
        Name: '9 Westminster/Main',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/9 Westminster'
      }
    },
    {
      type: 'Feature',
      id: 10,
      geometry: { type: 'Point', coordinates: [-118.4736556, 33.9895537, 0] },
      properties: {
        OID: 10,
        Name: '10 Westminster/Pacific',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/10 Westminster'
      }
    },
    {
      type: 'Feature',
      id: 11,
      geometry: {
        type: 'Point',
        coordinates: [-118.4737402, 33.9877616000001, 0]
      },
      properties: {
        OID: 11,
        Name: '11 Market/Speedway',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/11 Market'
      }
    },
    {
      type: 'Feature',
      id: 12,
      geometry: {
        type: 'Point',
        coordinates: [-118.4720191, 33.9875417000001, 0]
      },
      properties: {
        OID: 12,
        Name: '12 Windward/Pacific',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/12 Windward'
      }
    },
    {
      type: 'Feature',
      id: 13,
      geometry: { type: 'Point', coordinates: [-118.4714792, 33.9883912, 0] },
      properties: {
        OID: 13,
        Name: '13 Windward Circle/Main',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/13 Windward Circle'
      }
    },
    {
      type: 'Feature',
      id: 14,
      geometry: {
        type: 'Point',
        coordinates: [-118.4705851, 33.9879654000001, 0]
      },
      properties: {
        OID: 14,
        Name: '14 Windward Circle/Grand',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/14 Windward Circle'
      }
    },
    {
      type: 'Feature',
      id: 15,
      geometry: { type: 'Point', coordinates: [-118.4687901, 33.987491, 0] },
      properties: {
        OID: 15,
        Name: '15 Venice Way/Riviera',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/15 Venice Way'
      }
    },
    {
      type: 'Feature',
      id: 16,
      geometry: { type: 'Point', coordinates: [-118.4713672, 33.986746, 0] },
      properties: {
        OID: 16,
        Name: '16 Mildred/Pacific',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/16 Mildred'
      }
    },
    {
      type: 'Feature',
      id: 17,
      geometry: { type: 'Point', coordinates: [-118.471185, 33.9867073, 0] },
      properties: {
        OID: 17,
        Name: '17 Mildred/Pacific',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/17 Mildred'
      }
    },
    {
      type: 'Feature',
      id: 18,
      geometry: { type: 'Point', coordinates: [-118.4698396, 33.9848737, 0] },
      properties: {
        OID: 18,
        Name: '18 N Venice/Pacific',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/18 N Venice'
      }
    },
    {
      type: 'Feature',
      id: 19,
      geometry: {
        type: 'Point',
        coordinates: [-118.465049, 33.9871896000001, 0]
      },
      properties: {
        OID: 19,
        Name: '19 S Venice/Ocean',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/19 S Venice'
      }
    },
    {
      type: 'Feature',
      id: 20,
      geometry: {
        type: 'Point',
        coordinates: [-118.4607557, 33.9829527000001, 0]
      },
      properties: {
        OID: 20,
        Name: '20 Washington/Beach',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/20 Washington'
      }
    },
    {
      type: 'Feature',
      id: 21,
      geometry: {
        type: 'Point',
        coordinates: [-118.4629102, 33.9816841000001, 0]
      },
      properties: {
        OID: 21,
        Name: '21 Washington/Clune',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/21 Washington'
      }
    },
    {
      type: 'Feature',
      id: 22,
      geometry: { type: 'Point', coordinates: [-118.4637033, 33.9811688, 0] },
      properties: {
        OID: 22,
        Name: '22 Washington/Dell',
        FolderPath: 'Venice Dockless Drop Zones/Marked Locations/22 Washington'
      }
    }
  ]
} as FeatureCollection
