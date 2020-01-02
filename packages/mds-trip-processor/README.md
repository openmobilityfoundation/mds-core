# Trip Aggregation Processor
Included in this repo is the aggregation processor for vehicle trip data triggered via Knative CronJobSource at a schedule defined in the values.yaml helm chart file:

## Running the Processor
#### Setup & build
Dependencies: Istio, Knative, Natss
To install with the rest of the mds packages:
```
mdsctl install:mds
```
Several useful preset (-p) flags:
	processors: Will only deploy mds-agency and the three pipeline processors to yourt cluster
	data-external: For local development, pomts cluster to use local redis & postgres

#### Logging
To view the Trip-processor log:
```
kubectl logs $(kubectl get pods -A -o=name | sed "s/^.\{4\}//" | grep '^trip-processor') user-container -n mds -f
```

## Data Flow
#### Triggered by:
Cron schedule

#### Output
| type | key/table | description |
|------|-----|-------------|
| postgres row | reports_trips | entry of device trip information |
| redis cache | trips:events | hash set of every device's uncompleted trips containing their events |
| redis cache | trips:telemetry | hash set of every device's uncompleted trips containing their telemetry |
*Caches are clear once a trip is successfully processed 

#### Schema
REPORTS_TRIPS:
(PRIMARY KEY= [provider_id, device_id, trip_id])

| Column Name (type) | Description |
| ------ | ------ |
| vehicle_type (VARCHAR) | vehicle mode (e.g. scooter) |
| trip_id (UUID) | unique ID of trip |
| device_id (UUID) | unique ID of device |
| provider_id (UUID) | unique ID associated with a provider |
| recorded (BIGINT) | time of insert into DB |
| start_time (BIGINT) | time of trip start | 
| end_time (BIGINT) | time of trip end |
| start_service_area_id (UUID) | service_area_id of trip start |
| end_service_area_id (UUID) | service_area_id of trip end |
| duration (BIGINT) | time length of trip in milliseconds |
| distance (DOUBLE PRECISION) | length of trip |
| violation_count (INT) | number of tlemetry distance violations for a trip |
| max_violation_dist (DOUBLE PRECISION) | maximum violation distance |
| min_violation_dist (DOUBLE PRECISION) | minimum violation distance |
| avg_violation_dist (DOUBLE PRECISION) | average violation distance |
| events (JSON[]) | list of event object associated with a trip |
| telemetry (JSON[]) | list of telemetry objects associated with a trip | 


    


