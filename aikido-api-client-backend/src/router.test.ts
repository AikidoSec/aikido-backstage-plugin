import { mockErrorHandler, mockServices } from '@backstage/backend-test-utils';
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';
import { AikidoApiService } from './services/aikidoApiService/types';

import { AikidoCommonObjectInsights } from '@internal/backstage-plugin-aikido-common';

describe('createRouter', () => {
  let app: express.Express;
  let aikidoApiService: jest.Mocked<AikidoApiService>;

  beforeEach(async () => {
    aikidoApiService = {
      getIssueInsightsForRepoUrl: jest.fn(),
      getIssueInsightsForAccountIds: jest.fn(),
      getIssueInsightsForRepoIds: jest.fn(),
    };
    const router = await createRouter({
      httpAuth: mockServices.httpAuth(),
      aikidoApiService,
    });
    app = express();
    app.use(router);
    app.use(mockErrorHandler());
  });

  describe('POST /insights', () => {
    it('should return insights for repos', async () => {
      const repos = ['repo1', 'repo2'];
      const insights: { [repo: string]: AikidoCommonObjectInsights } = {
        repo1: {
          objectType: 'repo',
          repoId: 1,
          repoUrl: 'https://github.com/org/repo1',
          accountId: 1000,
          insights: { sast: { critical: 1, high: 0, medium: 0, low: 0 } },
        },
      };
      aikidoApiService.getIssueInsightsForRepoUrl.mockResolvedValue(insights);

      const response = await request(app).post('/insights').send({ repos });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(insights);
      expect(aikidoApiService.getIssueInsightsForRepoUrl).toHaveBeenCalledWith({
        repos,
      });
    });

    it('should return insights for account_ids', async () => {
      const account_ids = [1, 2];
      const insights: { [accountId: string]: AikidoCommonObjectInsights } = {
        '1': {
          objectType: 'account',
          repoId: undefined,
          repoUrl: undefined,
          accountId: 1000,
          insights: { sca: { critical: 1, high: 0, medium: 0, low: 0 } },
        },
      };
      aikidoApiService.getIssueInsightsForAccountIds.mockResolvedValue(
        insights,
      );

      const response = await request(app)
        .post('/insights')
        .send({ account_ids });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(insights);
      expect(
        aikidoApiService.getIssueInsightsForAccountIds,
      ).toHaveBeenCalledWith({
        accountIds: account_ids,
      });
    });

    it('should return insights for repo_ids', async () => {
      const repo_ids = [1, 2];
      const insights: { [repoId: string]: AikidoCommonObjectInsights } = {
        '1': {
          objectType: 'repo',
          repoId: 1,
          repoUrl: undefined,
          accountId: 1000,
          insights: { iac: { critical: 1, high: 0, medium: 0, low: 0 } },
        },
      };
      aikidoApiService.getIssueInsightsForRepoIds.mockResolvedValue(insights);

      const response = await request(app).post('/insights').send({ repo_ids });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(insights);
      expect(aikidoApiService.getIssueInsightsForRepoIds).toHaveBeenCalledWith({
        repoIds: repo_ids,
      });
    });

    it('should return combined insights for repos, account_ids, and repo_ids', async () => {
      const repos = ['repo1'];
      const account_ids = [1];
      const repo_ids = [101];

      const repoInsights: { [repo: string]: AikidoCommonObjectInsights } = {
        repo1: {
          objectType: 'repo',
          repoId: undefined,
          repoUrl: 'https://github.com/org/repo1',
          accountId: 1000,
          insights: { sast: { critical: 1, high: 0, medium: 0, low: 0 } },
        },
      };
      const accountInsights: {
        [accountId: string]: AikidoCommonObjectInsights;
      } = {
        '1': {
          objectType: 'account',
          repoId: undefined,
          repoUrl: undefined,
          accountId: 1000,
          insights: { sca: { critical: 0, high: 2, medium: 0, low: 0 } },
        },
      };
      const repoIdInsights: {
        [repoId: string]: AikidoCommonObjectInsights;
      } = {
        '101': {
          objectType: 'repo',
          repoId: 101,
          repoUrl: undefined,
          accountId: 1000,
          insights: { iac: { critical: 0, high: 0, medium: 3, low: 0 } },
        },
      };

      aikidoApiService.getIssueInsightsForRepoUrl.mockResolvedValue(
        repoInsights,
      );
      aikidoApiService.getIssueInsightsForAccountIds.mockResolvedValue(
        accountInsights,
      );
      aikidoApiService.getIssueInsightsForRepoIds.mockResolvedValue(
        repoIdInsights,
      );

      const response = await request(app)
        .post('/insights')
        .send({ repos, account_ids, repo_ids });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...repoInsights,
        ...accountInsights,
        ...repoIdInsights,
      });
    });

    it('should return 400 if no ids are provided', async () => {
      const response = await request(app).post('/insights').send({});
      expect(response.status).toBe(400);
    });

    it('should return 400 if repos is not an array of strings', async () => {
      const response = await request(app)
        .post('/insights')
        .send({ repos: [1] });
      expect(response.status).toBe(400);
    });
  });
});
