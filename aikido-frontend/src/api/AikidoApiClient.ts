import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { AikidoApi, AikidoApiError } from './types';

import { AikidoCommonObjectInsights } from '@internal/backstage-plugin-aikido-common';

/**
 * Options for API client
 */
export interface AikidoApiClientOptions {
  discoveryApi: DiscoveryApi;
  fetchApi: FetchApi;
}

/**
 * Simple API client for interacting with the Aikido API
 * Makes a single request with retry functionality for server errors
 */
export class AikidoApiClient implements AikidoApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    options: AikidoApiClientOptions & {
      maxRetries?: number;
      retryDelay?: number;
    } = {
      discoveryApi: {} as DiscoveryApi,
      fetchApi: {} as FetchApi,
    },
  ) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Fetch insights data with retries for server errors
   */
  async getInsights(request: {
    repos?: string[];
    account_ids?: number[];
    repo_ids?: number[];
  }): Promise<{ [key: string]: AikidoCommonObjectInsights }> {
    if (
      !request.repos?.length &&
      !request.account_ids?.length &&
      !request.repo_ids?.length
    ) {
      return {};
    }

    let attempts = 0;

    while (attempts <= this.maxRetries) {
      try {
        const baseUrl = await this.discoveryApi.getBaseUrl('aikido-api-client');

        const response = await this.fetchApi.fetch(`${baseUrl}/insights`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const text = await response.text();
          // eslint-disable-next-line no-console
          console.error(
            `[AikidoApiClient] Request failed: ${response.status} ${response.statusText}`,
            text,
          );

          if (response.status >= 400 && response.status < 500) {
            throw new AikidoApiError(
              `Failed to fetch insights: ${response.status} ${response.statusText} ${text}`,
              response.status,
              text,
            );
          }

          attempts++;
          if (attempts > this.maxRetries) {
            throw new Error('Failed to fetch insights');
          }

          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          continue;
        }

        const data = await response.json();
        return data;
      } catch (err) {
        if (err instanceof AikidoApiError) {
          throw err;
        }

        attempts++;
        if (attempts > this.maxRetries) {
          throw err;
        }

        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    return {};
  }
}
