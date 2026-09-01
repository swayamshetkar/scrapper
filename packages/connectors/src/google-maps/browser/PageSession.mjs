export class PageSession {
  async goto(_url, _options = {}) { throw new Error('PageSession.goto is not implemented'); }
  async evaluate(_fn, ..._args) { throw new Error('PageSession.evaluate is not implemented'); }
  async close() {}
}
