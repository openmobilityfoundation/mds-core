import { Provider } from '@mds-core/mds-types'
import { providers } from '@mds-core/mds-providers'
import { NativeApiRequest, NativeApiResponse } from '../types'

type GetProvidersRequest = NativeApiRequest

type GetProvidersResponse = NativeApiResponse<{
  providers: Provider[]
}>

export const GetProvidersHandler = async (req: GetProvidersRequest, res: GetProvidersResponse) =>
  res.status(200).send({
    version: res.locals.version,
    providers: Object.values(providers)
  })
