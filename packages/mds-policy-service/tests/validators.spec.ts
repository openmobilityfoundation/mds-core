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
})
