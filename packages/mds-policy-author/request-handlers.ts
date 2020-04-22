import logger from '@mds-core/mds-logger'
import db from '@mds-core/mds-db'
import { BadParamsError } from '@mds-core/mds-utils'
import { PolicyAuthorApiRequest, PolicyAuthorApiResponse } from './types'

const getPolicies = async (req: PolicyAuthorApiRequest, res: PolicyAuthorApiResponse) => {
  const { get_published, get_unpublished } = req.query
  const params = {
    get_published: get_published ? get_published === 'true' : null,
    get_unpublished: get_unpublished ? get_unpublished === 'true' : null
  }
  logger.info('read /policies', req.query)

  try {
    const policies = await db.readPolicies(params)

    // Let's not worry about filtering for just active policies at the moment.
    res.status(200).send(policies)
  } catch (err) {
    logger.error('failed to read policies', err)
    if (err instanceof BadParamsError) {
      res.status(400).send({
        result:
          'Cannot set both get_unpublished and get_published to be true. If you want all policies, set both params to false or do not send them.'
      })
    } else {
      res.status(404).send({
        result: 'not found'
      })
    }
  }
}

export { getPolicies }
