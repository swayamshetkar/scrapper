import { DiscoveryConnector } from '../../DiscoveryConnector.mjs';
import { extractBusinessesFromAppState } from '../parser/jspb.mjs';
import { normalizeGoogleMapsBusiness } from '../normalizer/normalize.mjs';

export class GoogleMapsBrowserConnector extends DiscoveryConnector {
  constructor({ pageSessionFactory, searchDelayMs = 2500 } = {}) { super('google_maps_browser'); this.pageSessionFactory = pageSessionFactory; this.searchDelayMs = searchDelayMs; }
  buildSearchUrl(query) { return `https://www.google.com/maps/search/${encodeURIComponent(query.query)}`; }
  async search(query) {
    if (!this.pageSessionFactory) throw new Error('GoogleMapsBrowserConnector requires a pageSessionFactory for live searches');
    const session = await this.pageSessionFactory();
    const sourceUrl = this.buildSearchUrl(query);
    try {
      await session.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeoutMs: 30000 });
      await new Promise((resolve) => setTimeout(resolve, this.searchDelayMs));
      const appState = await session.evaluate(() => globalThis.window?.APP_INITIALIZATION_STATE ?? null);
      return extractBusinessesFromAppState(appState).map((business) => ({ source: 'google_maps', source_url: sourceUrl, query, raw: business }));
    } finally { await session.close(); }
  }
  async extract(rawResult) { return rawResult.raw; }
  async normalize(rawProfile, context = {}) { return normalizeGoogleMapsBusiness(rawProfile, context); }
}
