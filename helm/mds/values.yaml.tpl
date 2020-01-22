apis:
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
  mds-config:
    enabled: true
    pathPrefix: /config
    version: ${CONFIG_VERSION}
    migration: false
  mds-web-sockets:
    enabled: true
    pathPrefix: /web-sockets
    version: ${WEB_SOCKETS_VERSION}
    migration: false
processors:
  mds-event-processor:
    enabled: true
    version: ${EVENT_PROCESSOR_VERSION}
    migration: false
    triggeredBy:
      trigger: [event, telemetry]
  mds-trip-processor:
    enabled: true
    version: ${TRIP_PROCESSOR_VERSION}
    migration: false
    triggeredBy:
      cron: '0 * * * *'
  mds-provider-processor:
    enabled: true
    version: ${PROVIDER_PROCESSOR_VERSION}
    migration: false
    triggeredBy:
      cron: '0 * * * *'
