export class InstagramPublicConnector {
  constructor(config = {}) {
    this.config = config;
  }

  async search(job) {
    // Stub: To be implemented
    // Will extract public profiles by hashtags or locations
    return [];
  }

  async extract(result) {
    // Stub
    return {};
  }

  async normalize(rawProfile, context) {
    // Stub
    return {
      business_name: "",
      category: "",
      city: "",
      evidence: []
    };
  }
}
