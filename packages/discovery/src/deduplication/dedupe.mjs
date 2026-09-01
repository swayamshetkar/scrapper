function keyFor(lead) {
  if (lead.website_domain) return `domain:${lead.website_domain}`;
  if (lead.place_id) return `place:${lead.place_id}`;
  if (lead.google_cid) return `cid:${lead.google_cid}`;
  if (lead.phone) return `phone:${String(lead.phone).replace(/\D/g, '')}`;
  return `name:${String(lead.business_name || '').toLowerCase()}|${String(lead.city || '').toLowerCase()}`;
}

export function dedupeLeads(leads) {
  const map = new Map();
  for (const lead of leads) {
    const key = keyFor(lead);
    const existing = map.get(key);
    if (!existing) { map.set(key, lead); continue; }
    map.set(key, { ...existing, ...Object.fromEntries(Object.entries(lead).filter(([, value]) => value != null && value !== '')), evidence: [...(existing.evidence || []), ...(lead.evidence || [])], provenance: [...(existing.provenance || []), ...(lead.provenance || [])] });
  }
  return [...map.values()];
}
