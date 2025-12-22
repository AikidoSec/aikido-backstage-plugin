import { getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import { aikidoApiService } from './aikidoApiService';
import { AikidoApi } from './AikidoApi';

jest.mock('./AikidoApi');

const MockedAikidoApi = AikidoApi as jest.MockedClass<typeof AikidoApi>;

describe('aikidoApiService', () => {
  const logger = getVoidLogger();
  const config = new ConfigReader({
    aikido: {
      clientId: 'test-client-id',
      authSecret: 'test-auth-secret',
    },
  });

  let mockGetAccounts: jest.Mock;
  let mockGetRepos: jest.Mock;
  let mockGetAccountInsights: jest.Mock;
  let mockGetRepoInsights: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAccounts = jest.fn();
    mockGetRepos = jest.fn();
    mockGetAccountInsights = jest.fn();
    mockGetRepoInsights = jest.fn();

    MockedAikidoApi.mockImplementation(
      (clientId, authSecret, loggerService) => {
        return {
          logger: loggerService,
          clientId,
          authSecret,
          token: 'mock-token',
          cache: {},
          getAccounts: mockGetAccounts,
          getRepos: mockGetRepos,
          getAccountInsights: mockGetAccountInsights,
          getRepoInsights: mockGetRepoInsights,
          getCacheTTL: jest.fn(),
          setCacheTTL: jest.fn(),
          fetchWithAuth: jest.fn(),
          authenticate: jest.fn(),
          getAccessToken: jest.fn().mockResolvedValue('mock-token'),
          clearAccountsCache: jest.fn(),
          clearReposCache: jest.fn(),
          clearInsightsCache: jest.fn(),
          clearRepoIssuesCache: jest.fn(),
          clearAllCache: jest.fn(),
        } as unknown as AikidoApi;
      },
    );
  });

  describe('getIssueInsightsForRepoUrl', () => {
    it('should filter out inactive repos', async () => {
      const accounts = [{ id: 1, name: 'Account 1' }];
      const repos = [
        {
          id: 101,
          repo_url: 'github.com/org/active-repo',
          is_active: true,
          name: 'active-repo',
        },
        {
          id: 102,
          repo_url: 'github.com/org/inactive-repo',
          is_active: false,
          name: 'inactive-repo',
        },
      ];
      const insights = { sast: { critical: 1, high: 2, medium: 3, low: 4 } };

      mockGetAccounts.mockResolvedValue(accounts);
      mockGetRepos.mockResolvedValue(repos);
      mockGetAccountInsights.mockResolvedValue(insights);
      mockGetRepoInsights.mockResolvedValue(insights);

      const service = await aikidoApiService({ logger, config });

      const result = await service.getIssueInsightsForRepoUrl({
        repos: ['active-repo', 'inactive-repo'],
      });

      // Verify only active repo should be in results
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['github.com/org/active-repo']).toBeDefined();
      expect(result['github.com/org/inactive-repo']).toBeUndefined();

      // Verify API calls
      expect(mockGetAccounts).toHaveBeenCalledTimes(1);
      expect(mockGetRepos).toHaveBeenCalledWith(1);
      expect(mockGetRepoInsights).toHaveBeenCalledWith(101);
      expect(mockGetRepoInsights).toHaveBeenCalledTimes(1);
    });

    it('should handle empty repos array', async () => {
      const service = await aikidoApiService({ logger, config });
      const result = await service.getIssueInsightsForRepoUrl({ repos: [] });

      expect(result).toEqual({});
      expect(mockGetAccounts).not.toHaveBeenCalled();
    });
  });

  describe('getIssueInsightsForRepoIds', () => {
    it('should filter out inactive repos', async () => {
      const accounts = [{ id: 1, name: 'Account 1' }];
      const repos = [
        { id: 101, name: 'active-repo', is_active: true },
        { id: 102, name: 'inactive-repo', is_active: false },
      ];
      const insights = { sast: { critical: 1, high: 2, medium: 3, low: 4 } };

      mockGetAccounts.mockResolvedValue(accounts);
      mockGetRepos.mockResolvedValue(repos);
      mockGetAccountInsights.mockResolvedValue(insights);
      mockGetRepoInsights.mockResolvedValue(insights);

      const service = await aikidoApiService({ logger, config });

      const result = await service.getIssueInsightsForRepoIds({
        repoIds: [101, 102],
      });

      // Verify only active repo should be in results
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['101']).toBeDefined();
      expect(result['102']).toBeUndefined();

      // Verify API calls
      expect(mockGetAccounts).toHaveBeenCalledTimes(1);
      expect(mockGetRepos).toHaveBeenCalledWith(1);
      expect(mockGetRepoInsights).toHaveBeenCalledWith(101);
    });

    it('should handle empty repoIds array', async () => {
      const service = await aikidoApiService({ logger, config });
      const result = await service.getIssueInsightsForRepoIds({ repoIds: [] });

      expect(result).toEqual({});
      expect(mockGetAccounts).not.toHaveBeenCalled();
    });
  });

  describe('getIssueInsightsForAccountIds', () => {
    it('should fetch insights for provided account IDs', async () => {
      const insights = {
        sast: { critical: 1, high: 2, medium: 3, low: 4 },
      };
      mockGetAccountInsights.mockResolvedValue(insights);

      const service = await aikidoApiService({ logger, config });

      const result = await service.getIssueInsightsForAccountIds({
        accountIds: [1, 2],
      });

      // Verify results
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['1']).toEqual({
        objectType: 'account',
        accountId: 1,
        repoId: undefined,
        repoUrl: undefined,
        insights: insights,
      });
      expect(result['2']).toEqual({
        objectType: 'account',
        accountId: 2,
        repoId: undefined,
        repoUrl: undefined,
        insights: insights,
      });

      // Verify API calls
      expect(mockGetAccountInsights).toHaveBeenCalledTimes(2);
      expect(mockGetAccountInsights).toHaveBeenCalledWith(1);
      expect(mockGetAccountInsights).toHaveBeenCalledWith(2);
    });

    it('should handle empty accountIds array', async () => {
      const service = await aikidoApiService({ logger, config });
      const result = await service.getIssueInsightsForAccountIds({
        accountIds: [],
      });

      expect(result).toEqual({});
      expect(mockGetAccountInsights).not.toHaveBeenCalled();
    });
  });
});
