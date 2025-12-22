import { AikidoInsights } from '@internal/backstage-plugin-aikido-api-client-backend';

export type AikidoCommonInsights = AikidoInsights;

export interface AikidoCommonAggregatedInsights {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface AikidoCommonObjectInsights {
  objectType: 'repo' | 'account';
  repoId?: number;
  accountId: number;
  repoUrl?: string;
  insights: AikidoCommonInsights;
  aggregated?: AikidoCommonAggregatedInsights;
}
