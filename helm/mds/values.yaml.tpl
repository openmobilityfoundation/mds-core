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
  mds-jurisdiction:
    enabled: true
    pathPrefix: /jurisdiction
    version: ${JURISDICTION_VERSION}
    migration: false
  mds-jurisdiction-service:
    enabled: true
    pathPrefix: /jurisdiction-service
    version: ${JURISDICTION_SERVICE_VERSION}
    migration: false
  mds-policy-author:
    enabled: true
    pathPrefix: /policy-author
    version: ${POLICY_AUTHOR_VERSION}
    migration: false
  mds-web-sockets:
    enabled: true
    pathPrefix: /web-sockets
    version: ${WEB_SOCKETS_VERSION}
    migration: false
  mds-geography:
    enabled: true
    pathPrefix: /geography
    version: ${GEOGRAPHY_VERSION}
    migration: false
  mds-geography-author:
    enabled: true
    pathPrefix: /geography-author
    version: ${GEOGRAPHY_AUTHOR_VERSION}
    migration: false