import { Device_v1_1_0 } from '../../index'
import { Device_v1_0_0 } from '../@types'

export const convert_v1_0_0_device_to_1_1_0 = (device: Device_v1_0_0): Device_v1_1_0 => ({
  ...device,
  accessibility_options: [],
  modality: 'micromobility'
})
