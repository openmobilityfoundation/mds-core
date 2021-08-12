# @mds-core/mds-types

## 0.3.2

### Patch Changes

- 6609400b: `vehicle_types` field in BaseRule should be restricted to `VEHICLE_TYPE[]`, not `string[]`

## 0.3.1

### Patch Changes

- 5eb4121b: Fixed BaseRule.value_url, to have 'string' instead of URL, so that it can be serialized on the RPC client

## 0.3.0

### Minor Changes

- 24231359: Remove delta, service_area_id, and timestamp_long from a variety of vehicle event types

## 0.2.1

### Patch Changes

- 8ab4569d: Minor patch change for every package to get versioning aligned with changeset workflows

## 0.2.0

### Minor Changes

- cc0a3bae: Added support for dead-letter sinks to StreamProcessors
