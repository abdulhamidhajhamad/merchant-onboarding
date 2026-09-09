import { z } from 'zod';

export const riskPolicyTagSchema = z.enum([
  'STANDARD',
  'ENHANCED_REVIEW',
  'RESTRICTED',
]);

export const mccSchema = z.object({
  mccCode: z.string().regex(/^\d{4}$/, 'MCC code must be exactly 4 digits'),
  description: z.string().trim().min(1).max(200),
  industryCategory: z.string().trim().min(1).max(120),
  confidenceScore: z.number().min(0).max(1),
  riskPolicyTags: z.array(riskPolicyTagSchema).min(1),
});

export type RiskPolicyTag = z.infer<typeof riskPolicyTagSchema>;
export type Mcc = z.infer<typeof mccSchema>;
