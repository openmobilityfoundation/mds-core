# @mds-core/mds-policy-service

## 0.4.1

### Patch Changes

- Updated dependencies [9af14cbb]
  - @mds-core/mds-logger@0.2.4
  - @mds-core/mds-geography-service@0.1.10
  - @mds-core/mds-repository@0.1.10
  - @mds-core/mds-rpc-common@0.1.10
  - @mds-core/mds-service-helpers@0.3.3
  - @mds-core/mds-utils@0.1.36
  - @mds-core/mds-schema-validators@0.3.1

## 0.4.0

### Minor Changes

- 439f92c5: Vastly clean up Policy types, remove generic extension of ApiServer

### Patch Changes

- 439f92c5: Add support for specifying transaction_types and service_types in Rules, ensure that currency is supplied when making a policy with Rate rules
- 707c4317: Make mds-test-data imports portable
- Updated dependencies [439f92c5]
  - @mds-core/mds-schema-validators@0.3.0
  - @mds-core/mds-types@0.4.0
  - @mds-core/mds-rpc-common@0.1.9
  - @mds-core/mds-geography-service@0.1.9
  - @mds-core/mds-repository@0.1.9
  - @mds-core/mds-service-helpers@0.3.2
  - @mds-core/mds-utils@0.1.35

## 0.3.0

### Minor Changes

- 936a0371: Add PresentationOptions for some PolicyService methods, enabling the display of policy status.
- 8a5bb24e: readPolicies can filter by geography_ids

### Patch Changes

- 936a0371: Add superseded_by column to policies table
- 936a0371: When publishing a new policy, update the superseded_by column for any policies it's superseding
- 42089b3f: removes mds-db from mds-policy

## 0.2.2

### Patch Changes

- b6802757: Updating mds-policy-service so mds-test-data not required to build, and moving some constants to mds-utils
- e6f408d4: fixes some test stability around random service ports
- Updated dependencies [b6802757]
  - @mds-core/mds-utils@0.1.34
  - @mds-core/mds-schema-validators@0.2.3
  - @mds-core/mds-geography-service@0.1.8
  - @mds-core/mds-repository@0.1.8
  - @mds-core/mds-service-helpers@0.3.1
  - @mds-core/mds-rpc-common@0.1.8

## 0.2.1

### Patch Changes

- e0860f5b: refactored mds-policy-author to use PolicyServiceClient instead of mds-db
- 6609400b: `vehicle_types` field in BaseRule should be restricted to `VEHICLE_TYPE[]`, not `string[]`
- Updated dependencies [e0860f5b]
- Updated dependencies [6609400b]
  - @mds-core/mds-service-helpers@0.3.0
  - @mds-core/mds-types@0.3.2
  - @mds-core/mds-rpc-common@0.1.7
  - @mds-core/mds-geography-service@0.1.7
  - @mds-core/mds-repository@0.1.7
  - @mds-core/mds-schema-validators@0.2.2
  - @mds-core/mds-utils@0.1.33

## 0.2.0

### Minor Changes

- 5eb4121b: Added policly queries and RPC methods for each query

### Patch Changes

- Updated dependencies [5eb4121b]
- Updated dependencies [5eb4121b]
- Updated dependencies [5eb4121b]
  - @mds-core/mds-service-helpers@0.2.0
  - @mds-core/mds-geography-service@0.1.6
  - @mds-core/mds-types@0.3.1
  - @mds-core/mds-rpc-common@0.1.6
  - @mds-core/mds-repository@0.1.6
  - @mds-core/mds-schema-validators@0.2.1
  - @mds-core/mds-utils@0.1.32

## 0.1.5

### Patch Changes

- 23c9c4a3: Migrated all mds-db/policies queries to typeORM
- Updated dependencies [24231359]
- Updated dependencies [93493a19]
  - @mds-core/mds-schema-validators@0.2.0
  - @mds-core/mds-types@0.3.0
  - @mds-core/mds-utils@0.1.31
  - @mds-core/mds-repository@0.1.5
  - @mds-core/mds-rpc-common@0.1.5
  - @mds-core/mds-service-helpers@0.1.5

## 0.1.4

### Patch Changes

- 8ab4569d: Minor patch change for every package to get versioning aligned with changeset workflows
- Updated dependencies [8ab4569d]
  - @mds-core/mds-repository@0.1.4
  - @mds-core/mds-rpc-common@0.1.4
  - @mds-core/mds-schema-validators@0.1.6
  - @mds-core/mds-service-helpers@0.1.4
  - @mds-core/mds-types@0.2.1
  - @mds-core/mds-utils@0.1.30

## 0.1.3

### Patch Changes

- Updated dependencies [cc0a3bae]
  - @mds-core/mds-types@0.2.0
  - @mds-core/mds-repository@0.1.3
  - @mds-core/mds-rpc-common@0.1.3
  - @mds-core/mds-schema-validators@0.1.5
  - @mds-core/mds-service-helpers@0.1.3
  - @mds-core/mds-utils@0.1.29
