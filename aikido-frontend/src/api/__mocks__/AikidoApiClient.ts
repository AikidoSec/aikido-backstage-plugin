import { AikidoApi } from '../types';
import { AikidoCommonObjectInsights } from '@internal/backstage-plugin-aikido-common';
import { mockInsightsData } from './mockData';

/**
 * Mock implementation of the Aikido API for development and testing
 */
export class MockAikidoApiClient implements AikidoApi {
  async getInsights(request: {
    repos?: string[];
    account_ids?: number[];
    repo_ids?: number[];
  }): Promise<{ [key: string]: AikidoCommonObjectInsights }> {
    const repos = request.repos || [];

    // If no repos are requested, return an empty object
    if (repos.length === 0) {
      return {};
    }

    // Filter the mock data to only include the requested repos
    const result: { [key: string]: AikidoCommonObjectInsights } = {};

    // For testing, we'll return data for any repo requested
    // If the repo is in our mock data, return that data
    // Otherwise, generate some random data
    repos.forEach(repo => {
      if (repo in mockInsightsData) {
        result[repo] = mockInsightsData[repo as keyof typeof mockInsightsData];
      } else {
        result[repo] = {
          objectType: 'repo',
          repoId: Math.floor(Math.random() * 1000),
          accountId: Math.floor(Math.random() * 1000),
          repoUrl: `https://github.com/org/${repo}.git`,
          insights: {
            cloud: {
              critical: Math.floor(Math.random() * 3),
              high: Math.floor(Math.random() * 5),
              medium: Math.floor(Math.random() * 10),
              low: Math.floor(Math.random() * 20),
            },
            leaked_secret: {
              critical: Math.floor(Math.random() * 2),
              high: Math.floor(Math.random() * 3),
              medium: Math.floor(Math.random() * 5),
              low: Math.floor(Math.random() * 8),
            },
            sast: {
              critical: Math.floor(Math.random() * 1),
              high: Math.floor(Math.random() * 4),
              medium: Math.floor(Math.random() * 8),
              low: Math.floor(Math.random() * 15),
            },
          },
        };
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    return result;
  }
}
