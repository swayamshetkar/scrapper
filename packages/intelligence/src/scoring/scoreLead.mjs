export const defaultScoringWeights = Object.freeze({ icpFit: 30, intent: 25, evidence: 15, contactability: 10, customerVolume: 10, sourceCoverage: 10 });

export function scoreLead(lead, campaign = {}, weights = defaultScoringWeights) {
  const reasons = [];
  let score = 0;
  const industries = new Set((campaign.industries || []).map((item) => String(item).toLowerCase()));
  if (!industries.size || industries.has(String(lead.business_category || '').toLowerCase())) { score += weights.icpFit; reasons.push('Industry matches campaign ICP'); }
  if ((lead.evidence || []).length > 0) { score += weights.evidence; reasons.push('Lead has explicit supporting evidence'); }
  if (lead.phone || lead.email || lead.website) { score += weights.contactability; reasons.push('Lead has at least one contact path'); }
  if ((lead.review_count || 0) >= 100) { score += weights.customerVolume; reasons.push('High public review volume suggests active customer demand'); }
  if (lead.source && lead.raw_source) { score += weights.sourceCoverage; reasons.push('Lead includes raw source provenance'); }
  return { lead_score: Math.max(0, Math.min(100, score)), icp_score: Math.min(100, score), intent_score: (lead.evidence || []).length ? 55 : 25, confidence: (lead.provenance || []).length >= 3 ? 0.76 : 0.52, reasons };
}
