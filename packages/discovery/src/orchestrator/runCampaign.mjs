import { buildDiscoveryQueries } from '../query-builder/buildQueries.mjs';
import { dedupeLeads } from '../deduplication/dedupe.mjs';
import { scoreLead } from '../../../intelligence/src/scoring/scoreLead.mjs';

export async function runCampaign(campaign, connectors) {
  const jobs = buildDiscoveryQueries(campaign);
  const rawResults = [];
  const failures = [];
  for (const job of jobs) {
    const connector = connectors[job.connector];
    if (!connector) { failures.push({ job, error: `Missing connector ${job.connector}` }); continue; }
    try { rawResults.push(...await connector.search(job)); }
    catch (error) { failures.push({ job, error: error instanceof Error ? error.message : String(error) }); }
  }
  const normalized = [];
  for (const result of rawResults) {
    const connector = connectors[result.query?.connector] || connectors.google_maps_browser;
    try {
      const rawProfile = await connector.extract(result);
      normalized.push(await connector.normalize(rawProfile, { sourceUrl: result.source_url, city: result.query?.city, industry: result.query?.industry }));
    }
    catch (error) { failures.push({ job: result.query, error: error instanceof Error ? error.message : String(error) }); }
  }
  const leads = dedupeLeads(normalized).map((lead) => ({ ...lead, score: scoreLead(lead, campaign) })).sort((a, b) => b.score.lead_score - a.score.lead_score);
  return { campaign, jobs, leads, failures };
}
