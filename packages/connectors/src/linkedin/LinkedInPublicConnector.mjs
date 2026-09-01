export class LinkedInPublicConnector {
  constructor(config = {}) {
    this.config = config;
  }

  async search(job) {
    // Stub: To be implemented
    // Will extract public company profiles or public posts based on search queries
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
