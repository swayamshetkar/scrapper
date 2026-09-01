import { createEvidence, createProvenance, nowIso } from '../../../../shared/src/types.mjs';

function normalizeDomain(urlOrDomain) {
  if (!urlOrDomain) return null;
  try { const url = urlOrDomain.startsWith('http') ? new URL(urlOrDomain) : new URL(`https://${urlOrDomain}`); return url.hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return String(urlOrDomain).replace(/^www\./, '').toLowerCase(); }
}

export function normalizeGoogleMapsBusiness(raw, context = {}) {
  const observedAt = context.observedAt ?? nowIso();
  const sourceUrl = context.sourceUrl ?? null;
  const phone = raw.phone?.e164 || raw.phone?.display || raw.phone?.digits || null;
  const websiteDomain = normalizeDomain(raw.websiteDomain || raw.website);
  const provenance = [];
  const addProvenance = (field, value) => { if (value != null && value !== '') provenance.push(createProvenance({ field, value, source: 'google_maps', sourceUrl, observedAt })); };
  addProvenance('business_name', raw.title); addProvenance('phone', phone); addProvenance('website', raw.website); addProvenance('rating', raw.ratingDecimal); addProvenance('review_count', raw.reviewsCount); addProvenance('address', raw.addressFormatted);
  const evidence = [];
  if (typeof raw.reviewsCount === 'number' && raw.reviewsCount >= 100) evidence.push(createEvidence({ claim: 'Company has high public customer/review volume', evidence: `Google Maps listing shows ${raw.reviewsCount} reviews.`, source: 'google_maps', sourceUrl, confidence: 0.82, observedAt }));
  return { lead_id: raw.placeId || raw.cid, source: 'google_maps', source_url: sourceUrl, business_name: raw.title, business_category: raw.primaryCategory, description: null, phone, website: raw.website, website_domain: websiteDomain, email: null, address: raw.addressFormatted || raw.addressFull, city: raw.city || context.city || null, state: raw.province || null, country: raw.countryCode || null, postcode: raw.postcode || null, latitude: raw.latitude, longitude: raw.longitude, rating: raw.ratingDecimal, review_count: raw.reviewsCount, opening_hours: raw.openingHours, place_id: raw.placeId, google_cid: raw.cid, knowledge_graph_id: raw.knowledgeGraphId, owner_information: raw.ownerInformation, social_links: [], evidence, provenance, raw_source: raw, discovered_at: observedAt, updated_at: observedAt };
}
