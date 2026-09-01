export const SignalTypes = Object.freeze([
  'hiring', 'expansion', 'new_location', 'funding', 'product_launch',
  'website_gap', 'technology_gap', 'growth', 'new_service', 'social_activity',
  'digital_transformation', 'ai_initiative', 'poor_reviews'
]);

export function nowIso() {
  return new Date().toISOString();
}

export function createEvidence({ claim, evidence, source, sourceUrl, confidence = 0.7, observedAt = nowIso() }) {
  if (!claim || !evidence || !source) throw new Error('Evidence requires claim, evidence, and source');
  return { evidence_id: crypto.randomUUID(), claim, evidence, source, source_url: sourceUrl ?? null, confidence, observed_at: observedAt };
}

export function createProvenance({ field, value, source, sourceUrl, observedAt = nowIso() }) {
  return { field, value, source, source_url: sourceUrl ?? null, observed_at: observedAt };
}
