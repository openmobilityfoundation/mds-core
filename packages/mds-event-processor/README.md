# Event Streaming Processor
Included in this repo is the stream processor for vehicle event and telemetry data sent via cloudevents with Knative eventing:

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
To view the Event-processor log:
```
kubectl logs $(kubectl get pods -A -o=name | sed "s/^.\{4\}//" | grep '^event-processor') user-container -n mds -f
```

## Data Flow
#### Triggered by:
| type | name | description |
|------|-----|-------------|
| cloudevent | {jurisdiction_id}.event |  cloudevent outputted by mds-agency of event from device |
| cloudevent | {jurisdiction_id}.telemetry | cloudevent outputted by mds-agency of telemetry from device |

#### Output
| type | key/table | description |
|------|-----|-------------|
| postgres row | reports_device_states | entry of device id and processed event information |
| redis cache | device:state | hash set of every device's last event and metadata |
| redis cache | trips:events | hash set of every device's uncompleted trips containing their events |
| redis cache | trips:telemetry | hash set of every device's uncompleted trips containing their telemetry |
TO BE ADDED: 
| redis cache | provider:state | hash set of all provider level metrics | 

#### Schema
REPORTS_DEVICE_STATES:
(PK= [timestamp, device_id, provider_id, type])

| Column Name (type) | Description |
| ------ | ------ |
| vehicle_type (VARCHAR) | vehicle mode (e.g. scooter) |
| type (VARCHAR) | event or telemetry |
| timestamp (BIGINT) | time of ping |
| device_id (UUID) | unique ID of device |
| provider_id (UUID) | unique ID associated with a provider |
| recorded (BIGINT) | time of insert into DB |
| annotation_version (SMALLINT) | version of geo service |
| annotation (JSON) | result of geo service that calculates service area based on lat/lng coords |
| gps (JSON) | gps data including: {lat, lng, altitude, heading, speed, accuracy} |
| service_area_id (UUID or null) | (EVENT SPECIFIC) unique ID associated with service area |
| charge (REAL) | charge of to battery on a 0 to 1 scale |
| state (VARCHAR or null) | (EVENT SPECIFIC) state of device, possibilites defined in EVENT_STATUS_MAP |
| event_type (VARCHAR or null) | (EVENT SPECIFIC) one of the possibilities defined in EVENT_STATUS_MAP |
| event_type_reason (VARCHAR or null) | (EVENT SPECIFIC) associated decorator of event_type |
| trip_id (UUID) | (EVENT SPECIFIC) unique ID of trip |
