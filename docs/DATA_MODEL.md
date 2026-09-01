# Data Model

Core tables: campaigns, companies, source_observations, field_provenance, evidence, signals, lead_scores.

Normalized fields are convenient current values. Source observations and field provenance are the audit trail. Never discard provenance when merging sources.

## companies minimum fields

id, canonical_name, business_category, description, website_domain, phone, email, address, city, state, country, postcode, latitude, longitude, created_at, updated_at.

## source_observations

id, company_id, source, source_url, external_id, raw_payload_json, observed_at.

## evidence

id, company_id, claim, evidence_text, source, source_url, observed_at, confidence.

## signals

id, company_id, signal_type, description, source, source_url, confidence, observed_at.
