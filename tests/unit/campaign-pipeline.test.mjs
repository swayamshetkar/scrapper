import assert from 'node:assert/strict';
import test from 'node:test';
import fixture from '../fixtures/maps-jspb-sample.mjs';
import { buildDiscoveryQueries } from '../../packages/discovery/src/query-builder/buildQueries.mjs';
import { runCampaign } from '../../packages/discovery/src/orchestrator/runCampaign.mjs';
import { GoogleMapsBrowserConnector } from '../../packages/connectors/src/google-maps/connector/GoogleMapsBrowserConnector.mjs';
import { extractBusinessesFromParsedJspb } from '../../packages/connectors/src/google-maps/parser/jspb.mjs';

test('builds dynamic city x industry x search term jobs', () => {
  const jobs = buildDiscoveryQueries({ industries: ['Dental clinics', 'Restaurants'], cities: ['Bangalore', 'Mysore'], searchTerms: ['dentists'] });
  assert.equal(jobs.length, 4);
  assert.deepEqual(jobs.map((job) => job.query), ['dentists Bangalore', 'dentists Bangalore', 'dentists Mysore', 'dentists Mysore']);
});

test('campaign pipeline returns scored leads with partial failure list', async () => {
  const raw = extractBusinessesFromParsedJspb(fixture);
  class FixtureConnector extends GoogleMapsBrowserConnector {
    async search(query) { return raw.map((business) => ({ source_url: `fixture://${query.query}`, query, raw: business })); }
  }
  const result = await runCampaign({ industries: ['Dental clinic'], cities: ['Bangalore'] }, { google_maps_browser: new FixtureConnector() });
  assert.equal(result.leads.length, 1);
  assert.equal(result.failures.length, 0);
  assert.ok(result.leads[0].score.lead_score >= 70);
});
