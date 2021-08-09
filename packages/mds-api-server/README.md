# MDS API Server

This package is the base server used for all MDS APIs.

## Middleware

- API Error Handling: Generic error handling middleware to handle common errors, so that dependents can simply call `next(error)` to handle errors from within their APIs.
- API Version: Versioning middleware which complies with the versioning negotiation outlined in the MDS standard.
- Authorization: Authorization middleware which takes an authorizer function, and extracts claims/scopes into `res.locals`.
- Compression: Compression middleware which attempts to compress API responses.
- CORS: CORS middleware which adds CORS negotiation to all API requests.
- Body Parser(s): JSON & Raw Body parser middleware which imposes request limits (can be overridden).
- Maintenance Mode: Middleware which adds a maintenance mode (response code 503) to APIs which are undergoing maintenance, and also blocks requests. Can be triggered by setting the `MAINTENANCE` environment variable.
- Request Logging: Request logging middleware which logs all requests. Additionally, highly detailed logging can be enabled via the `REQUEST_DEBUG` environment variable.

## Handlers

- Health: Adds a health endpoint to any APIs which returns basic information about the runtime (uptime, memory usage, etc...).
