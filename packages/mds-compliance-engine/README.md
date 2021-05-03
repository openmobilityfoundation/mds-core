# mds-compliance-engine

MDS Compliance Engine

## Build Instructions

Clone https://github.com/openmobilityfoundation/mds-core. Run `pnpm install` and `pnpm build`.

## Notes on business logic

This compliance code only works for `ModalityPolicy`.

A `Policy` should contain only one kind of rule. E.g. a policy can only have count rules, or only speed rules, but not a mixture of the two. While the spec was being developed, it was thought that it might be desirable to have policies that could combine rules. However, in practice, no such policies have ever been written and used, and to simplify this refactor, policies are assumed to contain only one kind of a rule at a time.

Order matters for rule evaluation. A vehicle that matches the first rule will not match for subsequent rules. The following example illustrates this.

### Example of rule ordering

Let's imagine that there's a city with a park. More scooters are allowed in the park than in the rest of the city. Here is a toy policy describing the differing caps:

```

{
  "policy_id": "2d3f8f2f-77dd-4718-b1f2-167e2c7c858e",
  "provider_ids": [],
  "name": "A city with a car policy",
  "description": " ",
  "start_date": 1602745200000,
  "end_date": null,
  "prev_policies": null,
  "rules": [
    {
      "rule_id": "a397a769-7cb5-46ef-9fc8-d0de4d9609b6",
      "name": "A park where one can scoot",
      "rule_type": "count",
      "geographies": [
        "6576f15a-453f-4b49-bfa3-ac2e11724111"
      ],
      "vehicle_types": ['scooter'],
      "states": {
        "available": [],
        "reserved": [],
        "on_trip": []
      },
      "maximum": 4
    },
    {
      "rule_id": "6d6916f1-801b-477a-bfd9-f333baf4aed7",
      "name": "The rest of the city is hostile towards scooters",
      "rule_type": "count",
      "geographies": [
        "a9b00de9-e325-40d9-b34d-3a37c1bd54d7"
      ],
      "vehicle_types": ['scooter'],
      "states": {
        "available": [],
        "reserved": [],
        "on_trip": []
      },
      "maximum": 1
    }
  ]
}
```

The park is wholly contained within the city. 4 scooters are allowed in the park, and only 1 in the rest of the city.

Now suppose four scooters (A, B, C, and D) arrive in the park, and a fifth one (E) is outside of the park, but still in the city. A, B, C and D match rule 1. They are taken out of consideration for the evaluation of rule 2. When we evaluate rule 2, only E remains unevaluated. E is the only vehicle that is a match for rule 2, which has a maximum of one, so no vehicles are in violation.

Now, suppose the rules were evaluated in reverse order, i.e. suppose rule 2 was evaluated first. Now, all of them are a match for rule 2. A is removed from consideration for the evaluation of rule 1, since rule 2 has a limit of 1. B, C, D, and E are now left for the evaluation of rule 1. B, C, and D match rule 1, which has a maximum of 4. E does not match rule 1 since it's outside of rule 1's geography. It is now considered in violation of the policy.

### Special notes for count rules

If a provider (or group of providers) goes over some count rule's maximum, all the vehicles are collectively responsible for the rule violation. Even though the vehicles that most recently entered the rule's geography pushed the provider(s) into violation, the violation wouldn't have happened had there not been already vehicles in the geography.

If a provider (or group of providers) goes under some count rule's minimum, while a violation has occurred, technically none of the vehicles present contributed to the violation. The "absent" vehicles are why the violation happened. That is, while a provider (or providers) may be in violation, it is impossible to assign any blame to any of the vehicles that were actually present.
