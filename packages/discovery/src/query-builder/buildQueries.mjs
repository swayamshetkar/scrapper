export function splitList(value) {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  return String(value || '').split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
}

export function buildDiscoveryQueries(campaign) {
  const industries = splitList(campaign.industries);
  const cities = splitList(campaign.cities);
  const searchTerms = splitList(campaign.searchTerms?.length ? campaign.searchTerms : industries);
  const jobs = [];
  for (const city of cities) for (const industry of industries) for (const term of searchTerms) {
    jobs.push({ connector: 'google_maps_browser', city, industry, term, query: `${term} ${city}`, source: 'google_maps' });
  }
  return jobs;
}
