# MDS API Authorizer

Package which contains helper functions for decoding JWT & Basic tokens which could come from API clients.

Note: currently all MDS APIs require JWT instead of Basic tokens as per the spec, however we use Basic tokens for CI/CD testing. The enforcement for JWT should be handled by an external ingress controller (e.g. envoy, nginx), in conjunction with an OAuth2 provider.
