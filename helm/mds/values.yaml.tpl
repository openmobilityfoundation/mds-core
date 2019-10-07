apis:
  mds-provider:
    enabled: true
    pathPrefix: /provider
    port: 4000
    version: ${PROVIDER_VERSION}
    useDB: true
    migration: false
    useCache: true
    useEvents: true
  mds-agency:
    enabled: true
    pathPrefix: /agency
    port: 4001
    version: ${AGENCY_VERSION}
    useDB: true
    migration: false
    useCache: true
    useEvents: true
  mds-audit:
    enabled: true
    pathPrefix: /audit
    port: 4002
    version: ${AUDIT_VERSION}
    useDB: true
    migration: false
    useCache: true
    useEvents: true
  mds-policy:
    enabled: true
    pathPrefix: /policy
    port: 4003
    version: ${POLICY_VERSION}
    useDB: true
    migration: false
    useCache: true
    useEvents: true
  mds-compliance:
    enabled: true
    pathPrefix: /compliance
    port: 4004
    version: ${COMPLIANCE_VERSION}
    useDB: true
    migration: false
    useCache: true
    useEvents: true
  mds-daily:
    enabled: true
    pathPrefix: /daily
    port: 4005
    version: ${DAILY_VERSION}
    useDB: true
    migration: false
    useCache: true
    useEvents: true
  mds-native:
    enabled: true
    pathPrefix: /native
    port: 4006
    version: ${NATIVE_VERSION}
    useDB: true
    migration: false
    useCache: true
    useEvents: true
  mds-policy-author:
    enabled: true
    pathPrefix: /policy-author
    port: 4007
    version: ${POLICY_AUTHOR_VERSION}
    useDB: true
    migration: false
    useCache: true
    useEvents: true
