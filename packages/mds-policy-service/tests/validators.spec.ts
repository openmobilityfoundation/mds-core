import { ValidationError } from '@mds-core/mds-utils'
import { validatePolicyDomainModel } from '../service/validators'
import { PolicyFactory } from './helpers'

describe('Tests Policy Validator', () => {
  it('Tests that policy without modality defined defaults to micrombility', () => {
    const policyShell = PolicyFactory()

    const { rules } = policyShell
    const policy = {
      ...policyShell,
      rules: rules.map(({ modality, ...r }) => ({
        ...r,
        states: { reserved: ['on_hours', 'provider_drop_off'] }
      }))
    }

    const result = validatePolicyDomainModel(policy)
    expect(result).toMatchObject(policy)
  })

  it('Tests that policy with a rule having an invalid start_time rejects', () => {
    const policyShell = PolicyFactory()

    const { rules } = policyShell
    const policy = {
      ...policyShell,
      rules: rules.map(r => ({
        ...r,
        start_time: '10:00' // this is invalid because it's missing seconds
      }))
    }

    expect(() => validatePolicyDomainModel(policy)).toThrowError(ValidationError)
  })

  it('Tests that policy with a rule having an invalid end_time rejects', () => {
    const policyShell = PolicyFactory()

    const { rules } = policyShell
    const policy = {
      ...policyShell,
      rules: rules.map(r => ({
        ...r,
        end_time: '10:00' // this is invalid because it's missing seconds
      }))
    }

    expect(() => validatePolicyDomainModel(policy)).toThrowError(ValidationError)
  })
})
