# MDS Ingest Service

gRPC-Web service which serves as the core repository for Devices/Events/Telemetry, and their annotations. This service is slightly monolithic due to the need to frequently consider all of the managed entities in tandem, and having them all centralized within one service enables much more efficient queries using `JOIN` operations.
