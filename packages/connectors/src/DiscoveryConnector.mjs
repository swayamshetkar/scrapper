export class DiscoveryConnector {
  constructor(source) { this.source = source; }
  async search(_query) { throw new Error(`${this.source}.search is not implemented`); }
  async extract(_rawResult) { throw new Error(`${this.source}.extract is not implemented`); }
  async normalize(_rawProfile) { throw new Error(`${this.source}.normalize is not implemented`); }
}
