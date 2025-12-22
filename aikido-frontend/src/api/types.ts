import { createApiRef } from '@backstage/core-plugin-api';
import {
  AikidoCommonObjectInsights,
  AikidoCommonAggregatedInsights,
} from '@internal/backstage-plugin-aikido-common';

export interface AikidoApi {
  getInsights(request: {
    repos?: string[];
    account_ids?: number[];
    repo_ids?: number[];
  }): Promise<{ [key: string]: AikidoCommonObjectInsights }>;
}

export const aikidoApiRef = createApiRef<AikidoApi>({
  id: 'plugin.aikido.service',
});

export interface ProcessedInsights {
  aggregated: AikidoCommonAggregatedInsights;
  byRepo: AikidoCommonObjectInsights[];
}

/**
 * Custom error class for Aikido API errors
 */
export class AikidoApiError extends Error {
  readonly statusCode: number;
  readonly responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = 'AikidoApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;

    Object.setPrototypeOf(this, AikidoApiError.prototype);
  }
}
