version: "3.7"
services:

  agency:
    image: mds-agency:${AGENCY_VERSION}
    ports:
      - "4001"
    environment:
      PATH_PREFIX: /agency
      PG_HOST: postgres
      PG_NAME: mds
      PG_USER: mdsadmin
      PG_PASS: "Password123#"
      PG_MIGRATIONS: "true"
      REDIS_HOST: redis

  audit:
    image: mds-audit:$AUDIT_VERSION
    ports:
      - "4002"
    environment:
      PATH_PREFIX: /audit
      PG_HOST: postgres
      PG_NAME: mds
      PG_USER: mdsadmin
      PG_PASS: "Password123#"
      PG_MIGRATIONS: "true"
      REDIS_HOST: redis

  policy:
    image: mds-policy:$POLICY_VERSION
    ports:
      - "4003"
    environment:
      PATH_PREFIX: /policy
      PG_HOST: postgres
      PG_NAME: mds
      PG_USER: mdsadmin
      PG_PASS: "Password123#"
      PG_MIGRATIONS: "true"
      REDIS_HOST: redis

  compliance:
    image: mds-compliance:$COMPLIANCE_VERSION
    ports:
      - "4004"
    environment:
      PATH_PREFIX: /compliance
      PG_HOST: postgres
      PG_NAME: mds
      PG_USER: mdsadmin
      PG_PASS: "Password123#"
      PG_MIGRATIONS: "true"
      REDIS_HOST: redis

  daily:
    image: mds-daily:$DAILY_VERSION
    ports:
      - "4005"
    environment:
      PATH_PREFIX: /daily
      PG_HOST: postgres
      PG_NAME: mds
      PG_USER: mdsadmin
      PG_PASS: "Password123#"
      PG_MIGRATIONS: "true"
      REDIS_HOST: redis

  native:
    image: mds-native:$NATIVE_VERSION
    ports:
      - "4006"
    environment:
      PATH_PREFIX: /native
      PG_HOST: postgres
      PG_NAME: mds
      PG_USER: mdsadmin
      PG_PASS: "Password123#"
      PG_MIGRATIONS: "true"
      REDIS_HOST: redis

  jurisdiction:
    image: mds-jurisdiction:$JURISDICTION_VERSION
    ports:
      - "4011"
    environment:
      PATH_PREFIX: /jurisdiction
      PG_HOST: postgres
      PG_NAME: mds
      PG_USER: mdsadmin
      PG_PASS: "Password123#"
      PG_MIGRATIONS: "true"
      REDIS_HOST: redis

  policy-author:
    image: mds-policy-author:$POLICY_AUTHOR_VERSION
    ports:
      - "4007"
    environment:
      PATH_PREFIX: /policy-author
      PG_HOST: postgres
      PG_NAME: mds
      PG_USER: mdsadmin
      PG_PASS: "Password123#"
      PG_MIGRATIONS: "true"
      REDIS_HOST: redis

  gateway:
    build:
      context: ./nginx
    ports:
      - "80:80"

  redis:
    image: redis:5
    ports:
      - "6379"

  postgres:
    image: postgres:10
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: mdsadmin
      POSTGRES_PASSWORD: "Password123#"
      POSTGRES_DB: mds

networks:
  default:
