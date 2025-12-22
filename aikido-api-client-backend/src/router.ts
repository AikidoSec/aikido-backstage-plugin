import { HttpAuthService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';
import { z } from 'zod';
import express from 'express';
import Router from 'express-promise-router';
import { AikidoApiService } from './services/aikidoApiService/types';

export async function createRouter({
  aikidoApiService,
}: {
  httpAuth?: HttpAuthService;
  aikidoApiService: AikidoApiService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  // Define schema for validating the request body
  const insightsSchema = z
    .object({
      repos: z.array(z.string()).optional(),
      account_ids: z.array(z.number()).optional(),
      repo_ids: z.array(z.number()).optional(),
    })
    .refine(
      data => data.repos || data.account_ids || data.repo_ids,
      'At least one of repos, account_ids, or repo_ids must be provided.',
    );

  // Endpoint to get insights for repositories - supports both single and multiple repos
  router.post('/insights', async (req, res) => {
    const parsed = insightsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(`Invalid request: ${parsed.error.toString()}`);
    }

    const { repos, account_ids, repo_ids } = parsed.data;
    let combinedInsights: { [key: string]: any } = {};

    if (repos && repos.length > 0) {
      const repoInsights = await aikidoApiService.getIssueInsightsForRepoUrl({
        repos,
      });
      combinedInsights = { ...combinedInsights, ...repoInsights };
    }

    if (account_ids && account_ids.length > 0) {
      const accountInsights =
        await aikidoApiService.getIssueInsightsForAccountIds({
          accountIds: account_ids,
        });
      combinedInsights = { ...combinedInsights, ...accountInsights };
    }

    if (repo_ids && repo_ids.length > 0) {
      const repoIdInsights = await aikidoApiService.getIssueInsightsForRepoIds({
        repoIds: repo_ids,
      });
      combinedInsights = { ...combinedInsights, ...repoIdInsights };
    }

    res.json(combinedInsights);
  });

  return router;
}
