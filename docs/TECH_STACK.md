# Technology Stack

## Language

TypeScript-oriented Node.js monorepo. The initial executable files are ESM JavaScript with JSDoc-friendly boundaries so parser and pipeline tests can run without dependency installation. The architecture is ready to move modules to .ts as the workspace grows.

## Runtime

- Node.js 20+
- Browser worker abstraction for Playwright or a future extension-controlled browser session
- SQLite/PostgreSQL-compatible relational schema for durable campaigns, companies, evidence, signals, and raw observations

## Backend Packages

- packages/shared: core types, provenance, evidence, logging, config
- packages/connectors: connector contracts and source-specific implementations
- packages/discovery: campaign query generation, orchestration, deduplication, pipeline control
- packages/intelligence: signal, intent, ICP, scoring, and personalization engines
- packages/storage: models, repositories, migrations

## Reliability Defaults

- Connector failures are isolated at the job/source level
- Rate limits, retries, timeouts, and circuit breakers belong below connector boundaries
- Raw source payloads are stored separately from normalized company records
- Every signal and generated conclusion must reference evidence
