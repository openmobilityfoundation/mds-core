export default {
  // 'key' for the organization (used by client to access additional client config)
  _organization: 'ladot',

  // Specifics about the organization
  organization: {
    // Name for reporting.
    name: 'Los Angeles Department of Transportation',
    // Name for reporting.
    shortName: 'LADOT',
    // List of active providers for this organization.
    // TODO: convert to UUIDs
    // TODO: server return format is UUIDs or all provider data?
    providers: ['Bird', 'Bolt', 'Jump', 'Lime', 'Lyft', 'Sherpa', 'Spin', 'Wheels'],
    // Used to determine "day" for the provider, e.g. for metrics reporting.
    // TODO: assuming one timezone per organization. ???
    timezone: 'America/Los_Angeles',
    // DOT organization center [lat,lng] (or other relevant point for tight map center).
    // Used as default for map "location", e.g. in audit mobile app.
    mapCenter: [-118.242985, 34.0513794],
    // FUTURE (Q1): Map bounds that encompass the entire organization jurisdiction.
    // Used to show map for jurisdiction bounds in reports.
    mapBounds: [
      [-118.69, 33.674],
      [-118.139, 34.357]
    ],
    // FUTURE: `name` of the jurisdiction boundary in the Geography table.
    // Will be used to restrict metrics to jurisdiction boundary.
    // NOTE: this must be `name` as `id` will change if geo is updated!!!
    jurisdictionGeoName: '??? TODO ???'
    // ... ???

    // TODO: address???
    // TODO: phone???
    // TODO: providerContact???
    // TODO: lacunaContact???
  },

  // Subsidiary `agencies` underneath the `organization`.
  // TODO: Properties below are subset? superset? of `organization` properties. ???
  // TODO: If one agency per org, this should be an `null`?  empty array? ???
  agencies: [
    // { name, shortName, mapCenter, mapBounds, jurisdictionGeoName, ...??? }, ...
  ],

  // Technical compliance SLA thresholds for metrics
  // Needed by metrics service/pipeline, Audit and Console aps.
  compliance_sla: {
    /** vehicles: Minimum number of registered vehicles for provider. */
    min_registered: 100,
    /** events: Minumum number of trip_start events per day. */
    min_trip_start_count: 100,
    /** events: Minumum number of trip_end events per day. */
    min_trip_end_count: 100,
    /** events: Minumum number of telemetry events per day. */
    min_telemetry_count: 1000, // TODO: confirm with Joan
    /** seconds: Maximum time between trip_start or trip_end event and submission to server. */
    max_start_end_time: 30,
    /** seconds: Maximum time between trip_enter or trip_leave event and submission to server. */
    max_enter_leave_time: 30,
    /** seconds: Maximum time between telemetry event and submission to server. (milliseconds) */
    max_telemetry_time: 60 * 60 * 24 * 1000,
    /** meters: Maximum distance between telemetry events when on-trip. */
    max_telemetry_distance: 100
  },

  // Status page for production app.
  // TODO: staging? dev?  any other config to go with this?
  statusAppUrl: 'https://status.ladot.io',

  // Agency-specific report setup
  reports: [
    {
      report: 'agency_tc_email', // Report name, known to client
      active: true, // Set to `false` to turn off the report or when developing a new one.
      frequency: 'daily', // Run once a day, vs say "hourly" or "weekly"
      time: '5:00', // Run at 5am
      recipients: ['agency_tc_email@ladot.lacuna.city'], // SendGrid mailing list
      slackChannel: 'ladot-reports', // Slack channel to post success/failure events to (???)
      params: {} // Report-specific parameters to pass to report invocation page (???)
    }
  ],

  // Per-app/per-environment setup for this organization.
  // Note that eventually a lot of this can be inferred,
  // but currently we need the flexibility allowed by the below.
  environments: {
    // Audit Mobile app:
    audit: {
      production: {
        apiServer: 'https://api.ladot.io',
        appUrl: 'https://ladot.mdsaudit.app',
        authDomain: 'auth.ladot.io',
        authClientId: 'IF5lGWhnmqBrGaGORJH2H3D5QuYtx4KL',
        authAudience: 'https://api.ladot.io/',
        s3Bucket: 's3://compliance-mobile-2.0',
        s3Profile: 'lacuna'
      },
      staging: {
        apiServer: 'https://test2.aws.lacuna.ai/',
        appUrl: 'https://dev.mdscompliance.app',
        authDomain: 'auth.ladot.io',
        authClientId: 'sgsSRcN9PLQhzseYH9cmrYDtp5NxC9s1',
        authAudience: 'https://develop.mds-testing.info/',
        s3Bucket: 's3://dev.mdscompliance.app',
        s3Profile: 'dev-ea'
      },
      dev: {
        apiServer: 'https://test2.aws.lacuna.ai',
        appUrl: 'https://localhost:3001',
        authDomain: 'auth.ladot.io',
        authClientId: 'sgsSRcN9PLQhzseYH9cmrYDtp5NxC9s1',
        authAudience: 'https://develop.mds-testing.info/'
        // NOTE: no deploy for "dev" environment
      }
    },

    // MDS-Console app:
    console: {
      production: null, // No production app yet
      staging: null, // No staging app yet
      dev: {
        apiServer: 'https://dev.api.ladot.io',
        appUrl: 'https://localhost:3003',
        authDomain: 'auth.ladot.io',
        authClientId: 'kPuq3MShnJYUM5B0jirMFnR8v7q27kvO',
        authAudience: 'https://sandbox.ladot.io'
      }
    },

    // Policy Manager app:
    policy: {
      production: null, // No production app yet
      staging: {
        apiServer: 'https://sandbox.ladot.io',
        appUrl: 'https://dev.lacuna.city/',
        authDomain: 'auth.ladot.io',
        authClientId: 'MV7X8rpMAPn2feIHRxBr03DiMygSL6S4',
        authAudience: 'https://sandbox.ladot.io/',
        s3Bucket: 's3://dev.lacuna.city',
        s3Profile: 'lacuna-apps-dev'
      },
      dev: {
        apiServer: 'https://sandbox.ladot.io',
        appUrl: 'http://localhost:3005',
        authDomain: 'auth.ladot.io',
        authClientId: 'MV7X8rpMAPn2feIHRxBr03DiMygSL6S4',
        authAudience: 'https://sandbox.ladot.io/'
      }
    }
  }
}
