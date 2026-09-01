import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeCampaign } from '../../../packages/discovery/src/orchestrator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/exports', express.static(path.join(rootDir, 'exports')));

// API Endpoint to run campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const { industries, cities, service } = req.body;
    
    if (!industries || !cities) {
      return res.status(400).json({ error: 'Industries and cities are required' });
    }

    const campaignConfig = {
      industries: industries.split(',').map(s => s.trim()),
      cities: cities.split(',').map(s => s.trim()),
      service: service || 'AI Appointment Automation',
      searchTerms: []
    };

    console.log(`[API] Starting campaign for ${industries} in ${cities}`);

    const result = await executeCampaign(campaignConfig, {
      delayMs: 2000, // Faster for web demo
      headed: false,
      exportDir: path.join(rootDir, 'exports'),
      logger: {
        info: (msg) => console.log(`[Campaign] ${msg}`),
        error: (msg) => console.error(`[Campaign Error] ${msg}`)
      }
    });

    res.json({
      success: true,
      message: 'Campaign completed successfully',
      leadsCount: result.leads.length,
      failuresCount: result.failures.length,
      downloadUrls: {
        json: `/exports/${result.exports.json}`,
        csv: `/exports/${result.exports.csv}`
      },
      preview: result.leads.slice(0, 10) // Send up to 10 leads for preview
    });
  } catch (error) {
    console.error(`[API Error]`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
