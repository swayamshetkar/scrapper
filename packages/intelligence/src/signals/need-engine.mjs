export function detectNeeds(lead, serviceProfile) {
  const needs = [];
  const reasons = [];
  let confidence = 0;

  // Simple heuristic based on service profile positive/negative signals
  let positiveMatches = 0;
  
  if (serviceProfile.positiveSignals.includes("high_review_volume")) {
    const reviewEvidence = lead.evidence?.find(e => e.claim.includes("review volume") || e.claim.includes("reviews"));
    if (reviewEvidence) {
      positiveMatches++;
      reasons.push(reviewEvidence.evidence);
    }
  }
  
  // Example for phone-first contact or no website
  if (serviceProfile.positiveSignals.includes("no_website")) {
    if (!lead.website || lead.website === "") {
      positiveMatches++;
      reasons.push("Business has no website listed on public profiles");
    }
  }

  // Calculate generic confidence
  if (positiveMatches > 0) {
    confidence = Math.min(1.0, 0.4 + (positiveMatches * 0.2));
    needs.push({
      service: serviceProfile.service,
      confidence: confidence,
      why: reasons,
      angle: serviceProfile.suggestedAngle || "Looks like you could use some help with " + serviceProfile.service
    });
  }

  return needs;
}
