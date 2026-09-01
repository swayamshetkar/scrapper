import { executeCampaign } from '../../../packages/discovery/src/orchestrator.mjs';

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function splitArg(name) {
  return argValue(name).split(',').map((item) => item.trim()).filter(Boolean);
}

const campaign = {
  service: argValue('service', 'AI Appointment Automation'),
  industries: splitArg('industries'),
  cities: splitArg('cities'),
  searchTerms: splitArg('terms')
};

if (!campaign.industries.length || !campaign.cities.length) {
  console.error('Usage: node run-campaign.mjs --industries="dentists" --cities="Bangalore" [--service="AI Appointment Automation"]');
  process.exit(1);
}

async function runCLI() {
  console.log(`Starting Campaign...`);
  console.log(`Targeting: ${campaign.industries.join(', ')} in ${campaign.cities.join(', ')}`);
  console.log(`Service: ${campaign.service}`);
  
  const result = await executeCampaign(campaign, {
    delayMs: Number(argValue('delay-ms', '5000')),
    headed: argValue('headed', 'false') === 'true',
    logger: {
      info: (msg) => console.log(msg),
      error: (msg) => console.error(msg)
    }
  });

  console.log(`\nCampaign complete! Data not stored. Exports available at:`);
  console.log(`JSON: exports/${result.exports.json}`);
  console.log(`CSV: exports/${result.exports.csv}`);
}

runCLI().catch(console.error);
