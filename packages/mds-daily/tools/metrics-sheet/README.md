# mds-metrics-sheet
Automate reporting api metrics into a LADOT compliance spreadsheet
```
AUTH0_DOMAIN=https://auth.ladot.io
AUDIENCE=https://api.ladot.io/agency/
CLIENT_ID=<client_id with admin>
CLIENT_SECRET=<client_secret>
SPREADSHEET_ID=<google spreadsheet id to update>
GOOGLE_CLIENT_EMAIL=<google service account email>
GOOGLE_PRIVATE_KEY=<service account private key>
```
Spreadsheet must have these headers:
`Date	Name	Registered	Deployed	Valid Trips	Trips	service_start	provider_dropoff	trip_start	trip_end	trip_enter	trip_leave	Telemetry	Telemetry SLA	Trip Start SLA	Trip End SLA`		
