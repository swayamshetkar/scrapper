import fixture from '../../../tests/fixtures/maps-jspb-sample.mjs';
import { extractBusinessesFromParsedJspb } from '../../../packages/connectors/src/google-maps/parser/jspb.mjs';
import { normalizeGoogleMapsBusiness } from '../../../packages/connectors/src/google-maps/normalizer/normalize.mjs';
import { scoreLead } from '../../../packages/intelligence/src/scoring/scoreLead.mjs';

const raw = extractBusinessesFromParsedJspb(fixture)[0];
const lead = normalizeGoogleMapsBusiness(raw, { sourceUrl: 'https://www.google.com/maps/search/dentists%20Bangalore', city: 'Bangalore' });
console.log(JSON.stringify({ business_name: lead.business_name, category: lead.business_category, city: lead.city, phone: lead.phone, website: lead.website, evidence: lead.evidence, score: scoreLead(lead, { industries: ['Dental clinic'] }) }, null, 2));
