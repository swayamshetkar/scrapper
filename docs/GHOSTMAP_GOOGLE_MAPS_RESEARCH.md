# GhostMap Google Maps Research

Reference inspected: https://github.com/uppifyagency/ghostmap.

Relevant source areas inspected locally:

- content/gmb/maps-state-watcher.js
- content/gmb/detail-fetcher.js
- content/gmb/observer.js
- background/jobQueue.js
- background/area-search.js
- lib/CircuitBreaker.js
- lib/SessionPool.js
- lib/EmailExtractor.js
- ui/sidepanel.js

## How GhostMap Extracts Maps Data

GhostMap is a Manifest V3 Chrome extension. Its Google Maps content script runs in the page main JavaScript world so it can read window.APP_INITIALIZATION_STATE, then it sends derived business records to the isolated extension context through window.postMessage.

The key Maps insight is that Google Maps loads a large XSSI-prefixed JSON/JSPB-style payload into page state. GhostMap searches nested page state for a large string beginning with the XSSI prefix, strips the prefix line, parses the JSON, recursively walks arrays, and treats array entries with a valid CID-like field as business records.

The parser maps known JSPB indexes into fields: business name [11], CID [10], place ID [78], knowledge graph ID [89], coordinates [9][2]/[9][3], website [7][0], website domain [7][1], category names [13], rating/reviews [4], formatted address [39], city [166], postcode/province [183][1], phone [178], opening hours [203], and owner information [57].

GhostMap also has a detail fetcher that builds a /maps/preview/place URL from known CID/FID/place/coordinate data and extracts fallback fields from the response. That detail layer is guarded by concurrency limits, retry/backoff, timeout, and a kill switch.

## Concepts Worth Adapting

- Browser-based extraction behind a connector interface, separate from the official Places API.
- Page-state parser as an isolated, unit-tested library.
- First-occurrence-wins accumulation by CID to avoid overwriting richer records.
- Drift canaries for brittle JSPB paths, especially rating/country/postcode.
- Separate detail backfill layer for incomplete search records.
- Source-specific raw payload preservation.
- Connector-level throttling, retries, and circuit breakers.
- Clear partial-failure behavior: one failed enrichment step must not kill a campaign.

## Concepts Not Copied

- Chrome extension UI and MV3 service-worker architecture.
- Italy-specific VAT extraction as a core requirement.
- CSV-first lead model.
- Extension-local storage design.
- Any direct dependency on GhostMap source code.

Our connector is a new implementation that uses the same general page-state idea, but its parser, normalizer, orchestration, data model, UI, and intelligence layer belong to this project.
