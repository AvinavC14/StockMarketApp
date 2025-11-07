import "better-auth";

declare module "better-auth" {
  interface User {
    metadata?: {
      country?: string;
      investmentGoals?: string;
      riskTolerance?: string;
      preferredIndustry?: string;
    };
  }
}
