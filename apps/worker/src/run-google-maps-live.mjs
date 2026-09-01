import { GoogleMapsBrowserConnector } from '../../../packages/connectors/src/google-maps/connector/GoogleMapsBrowserConnector.mjs';
import { createPlaywrightPageSession } from '../../../packages/connectors/src/google-maps/browser/PlaywrightPageSession.mjs';
import { buildDiscoveryQueries } from '../../../packages/discovery/src/query-builder/buildQueries.mjs';
import { dedupeLeads } from '../../../packages/discovery/src/deduplication/dedupe.mjs';
import { scoreLead } from '../../../packages/intelligence/src/scoring/scoreLead.mjs';

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function splitArg(name) {
  return argValue(name).split(',').map((item) => item.trim()).filter(Boolean);
}

const campaign = {
  service: argValue('service', 'AI customer support automation'),
  industries: splitArg('industries'),
  cities: splitArg('cities'),
  searchTerms: splitArg('terms')
};

if (!campaign.industries.length || !campaign.cities.length) {
  console.error('Usage: npm run maps:live -- --industries="dentists,dental clinics" --cities="Bangalore,Mysore" [--terms="dentists"] [--headed=true]');
  process.exit(1);
}

const connector = new GoogleMapsBrowserConnector({
  searchDelayMs: Number(argValue('delay-ms', '5000')),
  pageSessionFactory: () => createPlaywrightPageSession({
    headless: argValue('headed', 'false') !== 'true'
  })
});

const jobs = buildDiscoveryQueries(campaign);
const rawResults = [];
const failures = [];

for (const job of jobs) {
  try {
    console.error(`Searching Google Maps: ${job.query}`);
    const results = await connector.search(job);
    console.error(`Found ${results.length} raw result(s) for ${job.query}`);
    rawResults.push(...results);
  } catch (error) {
    failures.push({ job, error: error instanceof Error ? error.message : String(error) });
  }
}

const leads = [];
for (const result of rawResults) {
  try {
    const rawProfile = await connector.extract(result);
    const lead = await connector.normalize(rawProfile, {
      sourceUrl: result.source_url,
      city: result.query.city
    });
    leads.push({ ...lead, score: scoreLead(lead, campaign) });
  } catch (error) {
    failures.push({ job: result.query, error: error instanceof Error ? error.message : String(error) });
  }
}

const output = {
  campaign,
  jobs: jobs.length,
  failures,
  leads: dedupeLeads(leads).sort((a, b) => b.score.lead_score - a.score.lead_score)
};

console.log(JSON.stringify(output, null, 2));
