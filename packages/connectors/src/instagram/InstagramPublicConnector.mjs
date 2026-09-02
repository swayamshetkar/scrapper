import { DiscoveryConnector } from '../DiscoveryConnector.mjs';
import { createEvidence, createProvenance, nowIso } from '../../../shared/src/types.mjs';

function normalizeDomain(urlOrDomain) {
  if (!urlOrDomain) return null;
  try {
    const url = urlOrDomain.startsWith('http') ? new URL(urlOrDomain) : new URL(`https://${urlOrDomain}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return String(urlOrDomain).replace(/^www\./, '').toLowerCase();
  }
}

function extractPhone(text) {
  if (!text) return null;
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/);
  if (match && match[0].replace(/\D/g, '').length >= 7) {
    return match[0].trim();
  }
  return null;
}

function extractEmail(text) {
  if (!text) return null;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

function extractWebsite(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s"'<>]+|(?:www\.)[^\s"'<>]+\.[a-zA-Z]{2,}[^\s"'<>]*/i);
  if (match) {
    let url = match[0].replace(/[.,;)]+$/, '');
    return url.startsWith('http') ? url : `https://${url}`;
  }
  return null;
}

export class InstagramPublicConnector extends DiscoveryConnector {
  constructor({ pageSessionFactory, delayMs = 2000 } = {}) {
    super('instagram_public');
    this.pageSessionFactory = pageSessionFactory;
    this.delayMs = delayMs;
  }

  buildSearchUrl(query) {
    const searchTerm = `site:instagram.com "${query.term || query.industry}" "${query.city}"`;
    return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchTerm)}`;
  }

  async search(query) {
    const sourceUrl = this.buildSearchUrl(query);
    let results = [];

    // Attempt Playwright navigation first if session factory available
    if (this.pageSessionFactory) {
      try {
        const session = await this.pageSessionFactory();
        try {
          await session.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeoutMs: 30000 });
          await new Promise((resolve) => setTimeout(resolve, this.delayMs));
          
          results = await session.evaluate(() => {
            const items = [];
            const links = document.querySelectorAll('.result, .results_links');
            for (const el of links) {
              const titleEl = el.querySelector('.result__title a, a.result__url');
              const snippetEl = el.querySelector('.result__snippet, .result__body');
              const urlEl = el.querySelector('.result__url');
              
              const title = titleEl ? titleEl.textContent.trim() : '';
              const link = (titleEl && titleEl.href) || (urlEl && urlEl.textContent.trim()) || '';
              const snippet = snippetEl ? snippetEl.textContent.trim() : '';
              
              if (link.includes('instagram.com') && !link.includes('instagram.com/p/') && !link.includes('instagram.com/explore')) {
                items.push({ title, url: link, snippet });
              }
            }
            return items;
          });
        } finally {
          await session.close();
        }
      } catch (err) {
        // Fallback to fetch if browser session has errors
        results = await this.searchViaFetch(sourceUrl);
      }
    } else {
      results = await this.searchViaFetch(sourceUrl);
    }

    return results.map((item) => ({
      source: 'instagram',
      source_url: item.url,
      query,
      raw: item
    }));
  }

  async searchViaFetch(searchUrl) {
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = await response.text();
      const items = [];
      
      // Simple regex parser for DDG HTML results
      const resultRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = resultRegex.exec(html)) !== null) {
        const rawUrl = match[1];
        const snippet = match[3].replace(/<[^>]+>/g, '').trim();
        const urlMatch = rawUrl.match(/uddg=([^&]+)/);
        const url = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;
        
        if (url.includes('instagram.com') && !url.includes('/p/') && !url.includes('/explore/')) {
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          items.push({ title, url, snippet });
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  async extract(rawResult) {
    const raw = rawResult.raw || {};
    const title = raw.title || '';
    const snippet = raw.snippet || '';
    const url = raw.url || rawResult.source_url || '';

    // Extract handle from instagram URL (e.g. instagram.com/handle/)
    const handleMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    const handle = handleMatch && !['p', 'explore', 'stories', 'reels', 'about'].includes(handleMatch[1]) ? handleMatch[1] : null;

    // Clean business name from title e.g. "Dr. Smiles (@drsmiles) • Instagram photos" -> "Dr. Smiles"
    let businessName = title
      .replace(/\(@[a-zA-Z0-9._]+\)/g, '')
      .replace(/•.*$/g, '')
      .replace(/\|.*$/g, '')
      .replace(/- Instagram.*$/i, '')
      .replace(/Instagram photos and videos/i, '')
      .trim();

    if (!businessName && handle) {
      businessName = handle.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    const phone = extractPhone(snippet);
    const email = extractEmail(snippet);
    const website = extractWebsite(snippet);

    return {
      handle,
      business_name: businessName,
      title,
      bio: snippet,
      phone,
      email,
      website,
      url
    };
  }

  async normalize(rawProfile, context = {}) {
    const observedAt = context.observedAt ?? nowIso();
    const sourceUrl = context.sourceUrl || rawProfile.url || null;
    const websiteDomain = normalizeDomain(rawProfile.website);
    
    const provenance = [];
    const addProvenance = (field, value) => {
      if (value != null && value !== '') {
        provenance.push(createProvenance({ field, value, source: 'instagram', sourceUrl, observedAt }));
      }
    };

    addProvenance('business_name', rawProfile.business_name);
    addProvenance('social_links', sourceUrl);
    if (rawProfile.phone) addProvenance('phone', rawProfile.phone);
    if (rawProfile.email) addProvenance('email', rawProfile.email);
    if (rawProfile.website) addProvenance('website', rawProfile.website);

    const evidence = [];
    if (rawProfile.handle) {
      evidence.push(createEvidence({
        claim: 'Business has active public Instagram presence',
        evidence: `Public Instagram profile @${rawProfile.handle} found with public bio.`,
        source: 'instagram',
        sourceUrl,
        confidence: 0.78,
        observedAt
      }));
    }

    if (rawProfile.phone || rawProfile.email) {
      evidence.push(createEvidence({
        claim: 'Business lists direct contact information on social media',
        evidence: `Direct contact channels found on Instagram: ${[rawProfile.phone, rawProfile.email].filter(Boolean).join(', ')}`,
        source: 'instagram',
        sourceUrl,
        confidence: 0.85,
        observedAt
      }));
    }

    return {
      lead_id: `ig:${rawProfile.handle || crypto.randomUUID()}`,
      source: 'instagram',
      source_url: sourceUrl,
      business_name: rawProfile.business_name || (rawProfile.handle ? `@${rawProfile.handle}` : 'Instagram Business'),
      business_category: context.industry || 'Social Business',
      description: rawProfile.bio || null,
      phone: rawProfile.phone || null,
      website: rawProfile.website || null,
      website_domain: websiteDomain,
      email: rawProfile.email || null,
      address: null,
      city: context.city || null,
      state: null,
      country: null,
      postcode: null,
      latitude: null,
      longitude: null,
      rating: null,
      review_count: null,
      opening_hours: null,
      place_id: null,
      google_cid: null,
      knowledge_graph_id: null,
      owner_information: null,
      social_links: sourceUrl ? [sourceUrl] : [],
      evidence,
      provenance,
      raw_source: rawProfile,
      discovered_at: observedAt,
      updated_at: observedAt
    };
  }
}
