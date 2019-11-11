apis:
  mds-provider:
    enabled: true
    pathPrefix: /provider
    version: ${PROVIDER_VERSION}
    migration: false
  mds-agency:
    enabled: true
    pathPrefix: /agency
    version: ${AGENCY_VERSION}
    migration: false
  mds-audit:
    enabled: true
    pathPrefix: /audit
    version: ${AUDIT_VERSION}
    migration: false
  mds-policy:
    enabled: true
    pathPrefix: /policy
    version: ${POLICY_VERSION}
    migration: false
  mds-compliance:
    enabled: true
    pathPrefix: /compliance
    version: ${COMPLIANCE_VERSION}
    migration: false
  mds-daily:
    enabled: true
    pathPrefix: /daily
    version: ${DAILY_VERSION}
    migration: false
  mds-metrics:
    enabled: true
    pathPrefix: /metrics
    version: ${METRICS_VERSION}
    migration: false
  mds-native:
    enabled: true
    pathPrefix: /native
    version: ${NATIVE_VERSION}
    migration: false
  mds-policy-author:
    enabled: true
    pathPrefix: /policy-author
    version: ${POLICY_AUTHOR_VERSION}
    migration: false
