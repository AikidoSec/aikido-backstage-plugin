import { LoggerService } from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { AikidoApi } from './AikidoApi';
import { AikidoApiService, AikidoInsights, AikidoRepo } from './types';
import { Config } from '@backstage/config';

import { AikidoCommonObjectInsights } from '@internal/backstage-plugin-aikido-common';

export async function aikidoApiService({
  logger,
  config,
}: {
  logger: LoggerService;
  catalog?: typeof catalogServiceRef.T;
  config: Config;
}): Promise<AikidoApiService> {
  logger.info('Initializing AikidoApiService');

  const clientId = config.getString('aikido.clientId');
  const authSecret = config.getString('aikido.authSecret');

  const aikidoApi = new AikidoApi(clientId, authSecret, logger);

  const sumInsights = async (
    a: AikidoInsights,
    b: AikidoInsights,
  ): Promise<AikidoInsights> => {
    const result: AikidoInsights = {};

    for (const category of Object.keys(b)) {
      result[category] = { ...b[category] };
    }

    for (const category of Object.keys(a)) {
      if (!result[category]) {
        result[category] = { critical: 0, high: 0, medium: 0, low: 0 };
      }

      result[category].critical += a[category].critical || 0;
      result[category].high += a[category].high || 0;
      result[category].medium += a[category].medium || 0;
      result[category].low += a[category].low || 0;
    }

    return result;
  };

  return {
    async getIssueInsightsForRepoUrl(request: {
      repos: string[];
    }): Promise<{ [repo: string]: AikidoCommonObjectInsights }> {
      const repoInsights: { [repo: string]: AikidoCommonObjectInsights } = {};

      if (!request.repos || request.repos.length === 0) {
        logger.debug('No repos provided in request');
        return repoInsights;
      }
      logger.info(`Fetching insights for repos: ${request.repos.join(', ')}`);

      // On a high level, the logic is:
      // 1. Fetch all accounts from Aikido API
      // 2. For each account, fetch its repositories
      // 3. For each repository, check if it matches the requested repos
      // 4. If it matches, fetch insights for the account associated with the repo. Note: we are currently fetching insights for the workspace, not the specific repo because the API does not support repo-specific insights yet.
      // 5. Return the insights for the matched repos
      // 6. If no repos match, return an empty object
      try {
        const accounts = await aikidoApi.getAccounts();

        for (const account of accounts) {
          const repos = await aikidoApi.getRepos(account.id);

          for (const repo of repos) {
            if (!repo.repo_url) {
              logger.debug(`Repo ${repo.id} has no URL`);
              continue;
            }

            if (repo.is_active === false) {
              logger.debug(`Repo ${repo.repo_url} is inactive`);
              continue;
            }

            const matchingRepo = request.repos.find(r => {
              return repo.repo_url.includes(r);
            });

            if (matchingRepo) {
              // Use repo-specific insights instead of account-wide insights
              const insights = await aikidoApi.getRepoInsights(repo.id);

              // we need to update previously existing insights
              if (insights && repoInsights[repo.repo_url]?.insights) {
                repoInsights[repo.repo_url].insights = await sumInsights(
                  insights,
                  repoInsights[repo.repo_url].insights,
                );
              } else {
                repoInsights[repo.repo_url] = {
                  objectType: 'repo',
                  repoId: repo.id,
                  accountId: account.id,
                  repoUrl: repo.repo_url,
                  insights,
                };
              }
            }
          }
        }

        if (Object.keys(repoInsights).length === 0) {
          logger.debug(
            `No matching repos found for: ${request.repos.join(', ')}`,
          );
        }

        return repoInsights;
      } catch (error) {
        logger.error(`Error fetching Aikido insights: ${error}`);
        throw error;
      }
    },

    async getIssueInsightsForAccountIds(request: {
      accountIds: number[];
    }): Promise<{ [accountId: string]: AikidoCommonObjectInsights }> {
      const accountInsights: {
        [accountId: string]: AikidoCommonObjectInsights;
      } = {};
      if (!request.accountIds || request.accountIds.length === 0) {
        logger.debug('No account IDs provided in request');
        return accountInsights;
      }
      logger.info(
        `Fetching insights for accounts: ${request.accountIds.join(', ')}`,
      );

      for (const accountId of request.accountIds) {
        try {
          const insights = await aikidoApi.getAccountInsights(accountId);
          accountInsights[accountId.toString()] = {
            objectType: 'account',
            repoId: undefined,
            accountId,
            repoUrl: undefined,
            insights,
          };
        } catch (error) {
          logger.warn(
            `Error fetching insights for account ${accountId}: ${error}`,
          );
        }
      }

      return accountInsights;
    },

    async getIssueInsightsForRepoIds(request: {
      repoIds: number[];
    }): Promise<{ [repoId: string]: AikidoCommonObjectInsights }> {
      const repoInsights: { [repoId: string]: AikidoCommonObjectInsights } = {};

      if (!request.repoIds || request.repoIds.length === 0) {
        logger.debug('No repo IDs provided in request');
        return repoInsights;
      }

      logger.info(
        `Fetching insights for repo IDs: ${request.repoIds.join(', ')}`,
      );

      try {
        const accounts = await aikidoApi.getAccounts();
        const repoToAccountMap = new Map<number, number>();
        const repoIdToMetadataMap = new Map<number, AikidoRepo>();

        for (const account of accounts) {
          const repos = await aikidoApi.getRepos(account.id);
          for (const repo of repos) {
            if (repo.is_active === false) {
              logger.debug(`Repo ${repo.name} is inactive`);
              continue;
            }
            if (request.repoIds.includes(repo.id)) {
              repoToAccountMap.set(repo.id, account.id);
              repoIdToMetadataMap.set(repo.id, repo);
            }
          }
        }

        for (const repoId of request.repoIds) {
          const accountId = repoToAccountMap.get(repoId);
          const repo = repoIdToMetadataMap.get(repoId);
          if (accountId) {
            try {
              // Use repo-specific insights instead of account-wide insights
              const insights = await aikidoApi.getRepoInsights(repoId);

              // we need to update previously existing insights
              if (insights && repoInsights[repoId.toString()]?.insights) {
                repoInsights[repoId.toString()].insights = await sumInsights(
                  insights,
                  repoInsights[repoId.toString()].insights,
                );
              } else {
                repoInsights[repoId.toString()] = {
                  objectType: 'repo',
                  repoId,
                  accountId,
                  repoUrl: repo?.repo_url,
                  insights,
                };
              }
            } catch (error) {
              logger.warn(
                `Error fetching insights for repo id ${repoId} in account ${accountId}: ${error}`,
              );
            }
          }
        }
      } catch (error) {
        logger.error(`Error fetching Aikido insights for repos: ${error}`);
        throw error;
      }

      return repoInsights;
    },
  };
}
