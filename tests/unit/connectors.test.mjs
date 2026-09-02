import assert from 'node:assert/strict';
import test from 'node:test';
import { InstagramPublicConnector } from '../../packages/connectors/src/instagram/InstagramPublicConnector.mjs';
import { LinkedInPublicConnector } from '../../packages/connectors/src/linkedin/LinkedInPublicConnector.mjs';
import { buildDiscoveryQueries } from '../../packages/discovery/src/query-builder/buildQueries.mjs';

test('builds multi-source discovery queries for maps, instagram, and linkedin', () => {
  const jobs = buildDiscoveryQueries({
    industries: ['dentists'],
    cities: ['Bangalore'],
    sources: ['google_maps', 'instagram', 'linkedin']
  });
  assert.equal(jobs.length, 3);
  assert.deepEqual(jobs.map(j => j.source), ['google_maps', 'instagram', 'linkedin']);
});

test('instagram connector extracts bio, phone, and normalizes lead', async () => {
  const connector = new InstagramPublicConnector();
  const rawItem = {
    source: 'instagram',
    source_url: 'https://www.instagram.com/drsmiles_bangalore/',
    raw: {
      title: 'Dr. Smiles Dental Clinic (@drsmiles_bangalore) • Instagram',
      snippet: '🦷 Advanced dental care in Bangalore. 📞 Call us at +91 9876543210. 🌐 https://drsmiles.in',
      url: 'https://www.instagram.com/drsmiles_bangalore/'
    }
  };

  const extracted = await connector.extract(rawItem);
  assert.equal(extracted.handle, 'drsmiles_bangalore');
  assert.equal(extracted.business_name, 'Dr. Smiles Dental Clinic');
  assert.ok(extracted.phone.includes('9876543210'));
  assert.equal(extracted.website, 'https://drsmiles.in');

  const normalized = await connector.normalize(extracted, { city: 'Bangalore', industry: 'dentists' });
  assert.equal(normalized.source, 'instagram');
  assert.equal(normalized.business_name, 'Dr. Smiles Dental Clinic');
  assert.equal(normalized.city, 'Bangalore');
  assert.ok(normalized.evidence.length > 0);
});

test('linkedin connector extracts company profile, employees, and normalizes lead', async () => {
  const connector = new LinkedInPublicConnector();
  const rawItem = {
    source: 'linkedin',
    source_url: 'https://www.linkedin.com/company/bangalore-dental-hospital/',
    raw: {
      title: 'Bangalore Dental Hospital | LinkedIn',
      snippet: 'Bangalore Dental Hospital is a healthcare facility based in Bangalore, Karnataka. 11-50 employees.',
      url: 'https://www.linkedin.com/company/bangalore-dental-hospital/'
    }
  };

  const extracted = await connector.extract(rawItem);
  assert.equal(extracted.company_slug, 'bangalore-dental-hospital');
  assert.equal(extracted.business_name, 'Bangalore Dental Hospital');
  assert.equal(extracted.employee_count, '11-50 employees');

  const normalized = await connector.normalize(extracted, { city: 'Bangalore', industry: 'dentists' });
  assert.equal(normalized.source, 'linkedin');
  assert.equal(normalized.business_name, 'Bangalore Dental Hospital');
  assert.ok(normalized.provenance.length > 0);
});
