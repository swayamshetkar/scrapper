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

export class LinkedInPublicConnector extends DiscoveryConnector {
  constructor({ pageSessionFactory, delayMs = 2000 } = {}) {
    super('linkedin_public');
    this.pageSessionFactory = pageSessionFactory;
    this.delayMs = delayMs;
  }

  buildSearchUrl(query) {
    const searchTerm = `site:linkedin.com/company "${query.term || query.industry}" "${query.city}"`;
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
              
              if (link.includes('linkedin.com/company') || link.includes('linkedin.com/in')) {
                items.push({ title, url: link, snippet });
              }
            }
            return items;
          });
        } finally {
          await session.close();
        }
      } catch (err) {
        // Fallback to fetch
        results = await this.searchViaFetch(sourceUrl);
      }
    } else {
      results = await this.searchViaFetch(sourceUrl);
    }

    return results.map((item) => ({
      source: 'linkedin',
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
      
      const resultRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = resultRegex.exec(html)) !== null) {
        const rawUrl = match[1];
        const snippet = match[3].replace(/<[^>]+>/g, '').trim();
        const urlMatch = rawUrl.match(/uddg=([^&]+)/);
        const url = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;
        
        if (url.includes('linkedin.com/company') || url.includes('linkedin.com/in')) {
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

    // Extract company slug / ID
    const companyMatch = url.match(/linkedin\.com\/company\/([a-zA-Z0-9._-]+)/);
    const companySlug = companyMatch ? companyMatch[1] : null;

    // Clean business name: "Acme Health: Overview | LinkedIn" -> "Acme Health"
    let businessName = title
      .replace(/:\s*Overview\s*\|\s*LinkedIn/i, '')
      .replace(/\|\s*LinkedIn/i, '')
      .replace(/-\s*LinkedIn/i, '')
      .replace(/•\s*LinkedIn/i, '')
      .trim();

    if (!businessName && companySlug) {
      businessName = companySlug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // Extract employee size if mentioned in snippet e.g. "11-50 employees" or "500+ employees"
    const employeesMatch = snippet.match(/(\d+(?:,\d+)*(?:-\d+(?:,\d+)*|\+)?\s+employees)/i);
    const employeeCount = employeesMatch ? employeesMatch[1] : null;

    const phone = extractPhone(snippet);
    const email = extractEmail(snippet);

    return {
      company_slug: companySlug,
      business_name: businessName,
      title,
      description: snippet,
      employee_count: employeeCount,
      phone,
      email,
      url
    };
  }

  async normalize(rawProfile, context = {}) {
    const observedAt = context.observedAt ?? nowIso();
    const sourceUrl = context.sourceUrl || rawProfile.url || null;
    
    const provenance = [];
    const addProvenance = (field, value) => {
      if (value != null && value !== '') {
        provenance.push(createProvenance({ field, value, source: 'linkedin', sourceUrl, observedAt }));
      }
    };

    addProvenance('business_name', rawProfile.business_name);
    addProvenance('social_links', sourceUrl);
    if (rawProfile.phone) addProvenance('phone', rawProfile.phone);
    if (rawProfile.email) addProvenance('email', rawProfile.email);
    if (rawProfile.employee_count) addProvenance('employee_count', rawProfile.employee_count);

    const evidence = [];
    if (rawProfile.company_slug) {
      evidence.push(createEvidence({
        claim: 'Business has registered LinkedIn organization page',
        evidence: `LinkedIn Company page found: ${sourceUrl}${rawProfile.employee_count ? ` (${rawProfile.employee_count})` : ''}`,
        source: 'linkedin',
        sourceUrl,
        confidence: 0.88,
        observedAt
      }));
    }

    if (rawProfile.employee_count) {
      evidence.push(createEvidence({
        claim: 'Company has verified organization scale/employees',
        evidence: `LinkedIn shows organization size: ${rawProfile.employee_count}`,
        source: 'linkedin',
        sourceUrl,
        confidence: 0.85,
        observedAt
      }));
    }

    return {
      lead_id: `li:${rawProfile.company_slug || crypto.randomUUID()}`,
      source: 'linkedin',
      source_url: sourceUrl,
      business_name: rawProfile.business_name || 'LinkedIn Business',
      business_category: context.industry || 'Corporate / Enterprise',
      description: rawProfile.description || null,
      phone: rawProfile.phone || null,
      website: null,
      website_domain: null,
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
