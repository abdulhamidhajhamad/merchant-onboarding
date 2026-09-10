import { Injectable } from '@nestjs/common';

export interface RiskPolicyRule {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresEnhancedReview: boolean;
  riskTags: string[];
}

@Injectable()
export class RiskPolicyService {
  // السياسات العامة المعيارية (Global Default Risk Policies)
  private readonly defaultPolicies: Record<string, RiskPolicyRule> = {
    '6012': {
      riskLevel: 'HIGH',
      requiresEnhancedReview: true,
      riskTags: ['SPECIALIZED_MCC', 'FINANCIAL_OBLIGATION'],
    },
    '6051': {
      riskLevel: 'HIGH',
      requiresEnhancedReview: true,
      riskTags: ['SPECIALIZED_MCC', 'MONEY_SERVICES'],
    },
    '6211': {
      riskLevel: 'CRITICAL',
      requiresEnhancedReview: true,
      riskTags: ['HIGH_RISK_FINANCIAL', 'INVESTMENT_SERVICES'],
    },
    '5812': {
      riskLevel: 'LOW',
      requiresEnhancedReview: false,
      riskTags: ['STANDARD_RETAIL'],
    },
    '5411': {
      riskLevel: 'LOW',
      requiresEnhancedReview: false,
      riskTags: ['STANDARD_RETAIL'],
    },
  };

  // دعم الـ Provider-Specific Overrides (تجاوزات خاصة بكل مزود دفع أو جهة تنظيمية)
  private readonly providerOverrides: Record<string, Record<string, RiskPolicyRule>> = {
    'gweb-strict-provider': {
      '6012': {
        riskLevel: 'CRITICAL',
        requiresEnhancedReview: true,
        riskTags: ['SPECIALIZED_MCC', 'GWEB_STRICT_OVERRIDE'],
      },
    },
  };

  evaluateRisk(mccCode: string, providerId?: string): RiskPolicyRule {
    if (providerId && this.providerOverrides[providerId]?.[mccCode]) {
      return this.providerOverrides[providerId][mccCode];
    }

    if (this.defaultPolicies[mccCode]) {
      return this.defaultPolicies[mccCode];
    }

    return {
      riskLevel: 'MEDIUM',
      requiresEnhancedReview: false,
      riskTags: ['UNKNOWN_MCC_DEFAULT'],
    };
  }
}