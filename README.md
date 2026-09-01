# Lead Discovery Engine

Standalone AI-powered lead discovery and intelligence platform.

The product goal is not to list companies. It is to identify companies that appear likely to need a user's service, explain why, and attach evidence to every important claim.

## Current Phase

Phase 1 and the first Google Maps connector foundation are scaffolded.

Commands:

- npm test
- npm run lint
- npm run maps:demo

maps:demo runs the Google Maps parser and normalizer against a fixture. A live browser adapter can be added behind PageSession without changing the connector contract.
