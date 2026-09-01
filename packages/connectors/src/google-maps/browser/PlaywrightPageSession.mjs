export class PlaywrightPageSession {
  constructor({ page, context, browser }) {
    this.page = page;
    this.context = context;
    this.browser = browser;
  }

  async goto(url, options = {}) {
    return this.page.goto(url, {
      waitUntil: options.waitUntil ?? 'domcontentloaded',
      timeout: options.timeoutMs ?? 30000
    });
  }

  async evaluate(fn, ...args) {
    return this.page.evaluate(fn, ...args);
  }

  async close() {
    await this.browser?.close();
  }
}

export async function createPlaywrightPageSession(options = {}) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: options.headless ?? true
  });
  const context = await browser.newContext({
    locale: options.locale ?? 'en-IN',
    timezoneId: options.timezoneId ?? 'Asia/Kolkata',
    viewport: options.viewport ?? { width: 1365, height: 900 }
  });
  const page = await context.newPage();
  return new PlaywrightPageSession({ page, context, browser });
}
