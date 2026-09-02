import { GoogleMapsBrowserConnector } from '../../connectors/src/google-maps/connector/GoogleMapsBrowserConnector.mjs';
import { InstagramPublicConnector } from '../../connectors/src/instagram/InstagramPublicConnector.mjs';
import { LinkedInPublicConnector } from '../../connectors/src/linkedin/LinkedInPublicConnector.mjs';
import { createPlaywrightPageSession } from '../../connectors/src/google-maps/browser/PlaywrightPageSession.mjs';
import { buildDiscoveryQueries } from './query-builder/buildQueries.mjs';
import { dedupeLeads } from './deduplication/dedupe.mjs';
import { scoreLead } from '../../intelligence/src/scoring/scoreLead.mjs';
import { detectNeeds } from '../../intelligence/src/signals/need-engine.mjs';
import { exportLeads } from '../../shared/src/exporter.mjs';
import path from 'path';

export async function executeCampaign(campaignConfig, options = {}) {
  const {
    delayMs = 5000,
    headed = false,
    exportDir = 'exports',
    logger = console
  } = options;

  // Example Service Profile configuration that maps to Need Signals
  const serviceProfile = {
    service: campaignConfig.service,
    positiveSignals: [
      "high_review_volume",
      "phone_first_contact",
      "no_website"
    ],
    suggestedAngle: "Looks like you handle a high volume of inquiries. Automating intake and follow-ups could reduce manual front-desk workload."
  };

  logger.info("Initializing connectors...");
  
  // 1. Initialize all connectors
  const connectors = {
    google_maps_browser: new GoogleMapsBrowserConnector({
      searchDelayMs: Number(delayMs),
      pageSessionFactory: () => createPlaywrightPageSession({ headless: !headed })
    }),
    instagram_public: new InstagramPublicConnector({
      delayMs: Number(delayMs),
      pageSessionFactory: () => createPlaywrightPageSession({ headless: !headed })
    }),
    linkedin_public: new LinkedInPublicConnector({
      delayMs: Number(delayMs),
      pageSessionFactory: () => createPlaywrightPageSession({ headless: !headed })
    })
  };

  const jobs = buildDiscoveryQueries(campaignConfig);
  const rawResults = [];
  const failures = [];

  for (const job of jobs) {
    const connector = connectors[job.connector];
    if (!connector) {
      logger.error(`Unknown connector: ${job.connector}`);
      failures.push({ job, error: `Unknown connector: ${job.connector}` });
      continue;
    }

    try {
      logger.info(`Searching ${job.source}: ${job.query}`);
      const results = await connector.search(job);
      logger.info(`Found ${results.length} raw result(s) from ${job.source} for ${job.query}`);
      rawResults.push(...results);
    } catch (error) {
      logger.error(`Error searching ${job.source} for ${job.query}: ${error.message}`);
      failures.push({ job, error: error instanceof Error ? error.message : String(error) });
    }
  }

  // 2. Normalize leads in memory
  let leads = [];
  logger.info(`Normalizing ${rawResults.length} raw results...`);
  for (const result of rawResults) {
    const connectorName = result.query?.connector || (result.source === 'instagram' ? 'instagram_public' : result.source === 'linkedin' ? 'linkedin_public' : 'google_maps_browser');
    const connector = connectors[connectorName] || connectors.google_maps_browser;
    try {
      const rawProfile = await connector.extract(result);
      const lead = await connector.normalize(rawProfile, {
        sourceUrl: result.source_url,
        city: result.query?.city,
        industry: result.query?.industry
      });
      leads.push(lead);
    } catch (error) {
      logger.error(`Error normalizing lead: ${error.message}`);
      failures.push({ job: result.query, error: error instanceof Error ? error.message : String(error) });
    }
  }
  leads = dedupeLeads(leads);

  // 3. Detect need signals & Score
  logger.info(`Running Needs Engine on ${leads.length} unique leads...`);
  leads = leads.map(lead => {
    const needs = detectNeeds(lead, serviceProfile);
    const scoredLead = { ...lead, needs, score: scoreLead(lead, campaignConfig) };
    return scoredLead;
  });

  // Sort by lead score
  leads.sort((a, b) => b.score.lead_score - a.score.lead_score);
  
  // 4. Export CSV/JSON
  logger.info(`Exporting ${leads.length} processed leads...`);
  const jsonPath = await exportLeads(leads, 'json', exportDir);
  const csvPath = await exportLeads(leads, 'csv', exportDir);
  
  return {
    leads,
    failures,
    exports: {
      json: path.basename(jsonPath),
      csv: path.basename(csvPath)
    }
  };
}
