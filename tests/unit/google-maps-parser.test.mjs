import assert from 'node:assert/strict';
import test from 'node:test';
import fixture, { appStateFixture } from '../fixtures/maps-jspb-sample.mjs';
import { extractBusinessesFromParsedJspb, extractBusinessesFromAppState } from '../../packages/connectors/src/google-maps/parser/jspb.mjs';
import { normalizeGoogleMapsBusiness } from '../../packages/connectors/src/google-maps/normalizer/normalize.mjs';

test('extracts and deduplicates business records from JSPB arrays', () => {
  const businesses = extractBusinessesFromParsedJspb(fixture);
  assert.equal(businesses.length, 1);
  assert.equal(businesses[0].title, 'Smile Desk Dental');
  assert.equal(businesses[0].phone.e164, '+91 80 5555 1212');
  assert.equal(businesses[0].reviewsCount, 248);
});

test('finds XSSI payload inside app state', () => {
  const businesses = extractBusinessesFromAppState(appStateFixture);
  assert.equal(businesses.length, 1);
  assert.equal(businesses[0].placeId, 'ChIJ-test-place');
});

test('normalizes maps business with provenance and evidence', () => {
  const [raw] = extractBusinessesFromParsedJspb(fixture);
  const lead = normalizeGoogleMapsBusiness(raw, { sourceUrl: 'https://www.google.com/maps/search/dental%20Bangalore' });
  assert.equal(lead.business_name, 'Smile Desk Dental');
  assert.equal(lead.website_domain, 'smiledesk.example');
  assert.ok(lead.provenance.length >= 5);
  assert.equal(lead.evidence[0].claim, 'Company has high public customer/review volume');
});
