import { Device_v1_0_0 } from '../@types'
import { Device_v1_1_0 } from '../../index'

export const convert_v1_0_0_device_to_0_4_1 = (device: Device_v1_0_0): Device_v1_1_0 => ({
  ...device,
  accessibility_options: [],
  modality: 'micromobility'
})
