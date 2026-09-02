export function splitList(value) {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  return String(value || '').split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
}

export function buildDiscoveryQueries(campaign) {
  const industries = splitList(campaign.industries);
  const cities = splitList(campaign.cities);
  const searchTerms = splitList(campaign.searchTerms?.length ? campaign.searchTerms : industries);
  
  let sources = splitList(campaign.sources);
  if (!sources.length) {
    sources = ['google_maps'];
  } else if (sources.includes('all')) {
    sources = ['google_maps', 'instagram', 'linkedin'];
  }

  const jobs = [];
  for (const city of cities) {
    for (const industry of industries) {
      for (const term of searchTerms) {
        for (const source of sources) {
          const s = source.toLowerCase();
          if (s === 'google_maps' || s === 'maps') {
            jobs.push({
              connector: 'google_maps_browser',
              city,
              industry,
              term,
              query: `${term} ${city}`,
              source: 'google_maps'
            });
          } else if (s === 'instagram' || s === 'insta') {
            jobs.push({
              connector: 'instagram_public',
              city,
              industry,
              term,
              query: `site:instagram.com "${term}" "${city}"`,
              source: 'instagram'
            });
          } else if (s === 'linkedin') {
            jobs.push({
              connector: 'linkedin_public',
              city,
              industry,
              term,
              query: `site:linkedin.com/company "${term}" "${city}"`,
              source: 'linkedin'
            });
          }
        }
      }
    }
  }
  return jobs;
}
