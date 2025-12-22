import {
  AikidoApi,
  aikidoApiInsightsUrl,
  aikidoApiReposUrl,
  aikidoApiTokenUrl,
  aikidoApiAccountsUrl,
} from './AikidoApi';
import { mockServices } from '@backstage/backend-test-utils';
import { LoggerService } from '@backstage/backend-plugin-api';
import {
  AikidoAccount,
  AikidoInsights,
  AikidoRepo,
  AikidoToken,
} from './types';
import NodeCache from 'node-cache';

jest.mock('node-cache');

global.fetch = jest.fn();

describe('AikidoApi', () => {
  let api: AikidoApi;
  let mockLogger: LoggerService;
  let mockCache: jest.Mocked<NodeCache>;

  const mockClientId = 'test-client-id';
  const mockAuthSecret = 'test-auth-secret';

  const mockToken: AikidoToken = {
    access_token: 'test-token',
    token_type: 'Bearer',
    expires_in: 3600,
  };

  const mockAccounts: AikidoAccount[] = [
    {
      id: 1,
      name: 'Test Account 1',
      account_external_ref: 'github',
      created_at: 1737541531,
      summary: {
        connected_repos: 1,
        connected_clouds: 0,
        connected_containers: 0,
        connected_domains: 0,
      },
    },
    {
      id: 2,
      name: 'Test Account 2',
      account_external_ref: 'github',
      created_at: 1737541531,
      summary: {
        connected_repos: 1,
        connected_clouds: 0,
        connected_containers: 0,
        connected_domains: 0,
      },
    },
  ];

  const mockRepos: AikidoRepo[] = [
    {
      id: 101,
      name: 'repo1',
      is_active: true,
      repo_url: 'https://github.com/org/repo1',
      configuration_issues: [
        new Map([['issue1', 'description1']]),
        new Map([['issue2', 'description2']]),
      ],
    },
    {
      id: 102,
      name: 'repo2',
      is_active: false,
      repo_url: 'github.com/org/repo2',
      configuration_issues: [],
    },
  ];

  const mockInsights: AikidoInsights = {
    sast: { critical: 1, high: 2, medium: 3, low: 4 },
    sca: { critical: 0, high: 1, medium: 2, low: 3 },
    iac: { critical: 0, high: 0, medium: 1, low: 2 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = mockServices.logger.mock();

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
      keys: jest.fn(),
    } as unknown as jest.Mocked<NodeCache>;

    (NodeCache as unknown as jest.Mock).mockImplementation(() => mockCache);

    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes(aikidoApiTokenUrl)) {
        return {
          ok: true,
          json: async () => mockToken,
        };
      } else if (url.includes(aikidoApiAccountsUrl)) {
        return {
          ok: true,
          json: async () => mockAccounts,
        };
      } else if (url.includes(aikidoApiReposUrl)) {
        return {
          ok: true,
          json: async () => mockRepos,
        };
      } else if (url.includes(aikidoApiInsightsUrl)) {
        return {
          ok: true,
          json: async () => mockInsights,
        };
      }
      return { ok: false, status: 404, statusText: 'Not Found' };
    });

    api = new AikidoApi(mockClientId, mockAuthSecret, mockLogger);
  });

  describe('getAccounts', () => {
    it('should cache accounts data and retrieve from cache on subsequent calls', async () => {
      // First call should fetch data
      mockCache.get.mockReturnValueOnce(undefined);
      const accounts1 = await api.getAccounts();

      expect(accounts1).toEqual(mockAccounts);
      expect(mockCache.set).toHaveBeenCalledWith('accounts_', mockAccounts);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiAccountsUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledTimes(2); // token + accounts

      jest.clearAllMocks();

      // Second call should use cache
      mockCache.get.mockReturnValueOnce(mockAccounts);
      const accounts2 = await api.getAccounts();

      expect(accounts2).toEqual(mockAccounts);
      expect(global.fetch).not.toHaveBeenCalled(); // no additional fetch calls
    });
  });

  describe('getRepos', () => {
    it('should cache repos data and retrieve from cache on subsequent calls', async () => {
      const accountId = 1;
      const cacheKey = 'repos_1';

      // First call should fetch data
      mockCache.get.mockReturnValueOnce(undefined);
      const repos1 = await api.getRepos(accountId);

      expect(repos1).toEqual(mockRepos);
      expect(mockCache.set).toHaveBeenCalledWith(cacheKey, mockRepos);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiReposUrl}?account_id=${accountId}`),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledTimes(2); // token + repos

      jest.clearAllMocks();

      // Second call should use cache
      mockCache.get.mockReturnValueOnce(mockRepos);
      const repos2 = await api.getRepos(accountId);

      expect(repos2).toEqual(mockRepos);
      expect(global.fetch).not.toHaveBeenCalled(); // no additional fetch calls
    });
  });

  describe('getAccountInsights', () => {
    it('should cache insights data and retrieve from cache on subsequent calls', async () => {
      const accountId = 1;
      const cacheKey = 'insights_1';

      // First call should fetch data
      mockCache.get.mockReturnValueOnce(undefined);
      const insights1 = await api.getAccountInsights(accountId);

      expect(insights1).toEqual(mockInsights);
      expect(mockCache.set).toHaveBeenCalledWith(cacheKey, mockInsights);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `${aikidoApiInsightsUrl}?account_id=${accountId}`,
        ),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledTimes(2); // token + insights

      jest.clearAllMocks();

      // Second call should use cache
      mockCache.get.mockReturnValueOnce(mockInsights);
      const insights2 = await api.getAccountInsights(accountId);

      expect(insights2).toEqual(mockInsights);
      expect(global.fetch).not.toHaveBeenCalled(); // no additional fetch calls
    });
  });

  describe('clearAccountsCache', () => {
    it('should delete accounts cache', () => {
      api.clearAccountsCache();

      expect(mockCache.del).toHaveBeenCalledWith('accounts_');
      expect(mockLogger.debug).toHaveBeenCalledWith('Clearing accounts cache');
    });
  });

  describe('clearReposCache', () => {
    it('should delete specific account repos cache when accountId is provided', () => {
      const accountId = 1;
      api.clearReposCache(accountId);

      expect(mockCache.del).toHaveBeenCalledWith('repos_1');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Clearing repos cache for account ID: 1',
      );
    });

    it('should delete all repos caches when no accountId is provided', () => {
      // Mock cache keys
      mockCache.keys.mockReturnValueOnce(['repos_1', 'repos_2', 'insights_1']);

      api.clearReposCache();

      expect(mockCache.keys).toHaveBeenCalled();
      expect(mockCache.del).toHaveBeenCalledWith(['repos_1', 'repos_2']);
      expect(mockLogger.debug).toHaveBeenCalledWith('Clearing all repos cache');
    });
  });

  describe('clearInsightsCache', () => {
    it('should delete specific account insights cache when accountId is provided', () => {
      const accountId = 1;
      api.clearInsightsCache(accountId);

      expect(mockCache.del).toHaveBeenCalledWith('insights_1');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Clearing insights cache for account ID: 1',
      );
    });

    it('should delete all insights caches when no accountId is provided', () => {
      mockCache.keys.mockReturnValueOnce([
        'insights_1',
        'insights_2',
        'repos_1',
      ]);

      api.clearInsightsCache();

      expect(mockCache.keys).toHaveBeenCalled();
      expect(mockCache.del).toHaveBeenCalledWith(['insights_1', 'insights_2']);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Clearing all insights cache',
      );
    });
  });

  describe('clearAllCaches', () => {
    it('should flush all caches', () => {
      api.clearAllCaches();

      expect(mockCache.flushAll).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Clearing all caches');
    });

    it('should invalidate all cached data', async () => {
      jest.spyOn(api, 'getAccounts');
      jest.spyOn(api, 'getRepos');
      jest.spyOn(api, 'getAccountInsights');

      // First calls - should fetch from API and cache
      mockCache.get.mockReturnValue(undefined);
      await api.getAccounts();
      await api.getRepos(1);
      await api.getAccountInsights(1);

      // Verify cache was used to store values
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiInsightsUrl}?account_id=1`),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiAccountsUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiReposUrl}?account_id=1`),
        expect.anything(),
      );
      expect(mockCache.set).toHaveBeenCalledTimes(3);

      // Reset for next round
      jest.clearAllMocks();

      // Second calls - should use cache
      mockCache.get.mockImplementation((key: string | number) => {
        if (key === 'accounts_') return mockAccounts;
        if (key === 'repos_1') return mockRepos;
        if (key === 'insights_1') return mockInsights;
        return undefined;
      });

      await api.getAccounts();
      await api.getRepos(1);
      await api.getAccountInsights(1);

      // Verify API wasn't called again (used cache)
      expect(global.fetch).not.toHaveBeenCalled();

      // Clear all caches
      jest.clearAllMocks();
      mockCache.get.mockReturnValue(undefined);
      api.clearAllCaches();

      // Third calls - should fetch from API again since cache was cleared
      await api.getAccounts();
      await api.getRepos(1);
      await api.getAccountInsights(1);

      // Verify data was re-fetched and re-cached
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiInsightsUrl}?account_id=1`),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiAccountsUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiReposUrl}?account_id=1`),
        expect.anything(),
      );
      expect(mockCache.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('paginatedFetch', () => {
    const perPageLimit = 20; // As defined in AikidoApi.ts, note that changes to this limit will require updates to the tests

    const generateMockAccounts = (count: number): AikidoAccount[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `Test Account ${i + 1}`,
        account_external_ref: 'github',
        created_at: 1737541531,
        summary: {
          connected_repos: 1,
          connected_clouds: 0,
          connected_containers: 0,
          connected_domains: 0,
        },
      }));
    };

    it('should handle exactly one page of results', async () => {
      const totalItems = perPageLimit - 1;
      const accounts = generateMockAccounts(totalItems);
      (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url.includes(aikidoApiTokenUrl)) {
          return { ok: true, json: async () => mockToken };
        }
        if (url.includes(aikidoApiAccountsUrl)) {
          return { ok: true, json: async () => accounts };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      const result = await api.getAccounts();

      expect(result).toHaveLength(totalItems);
      expect(global.fetch).toHaveBeenCalledTimes(2); // 1 for token, 1 for accounts
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiAccountsUrl}?per_page=20&page=0`),
        expect.anything(),
      );
    });

    it('should handle exactly the page limit number of results', async () => {
      const totalItems = perPageLimit;
      const accounts = generateMockAccounts(totalItems);
      (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url.includes(aikidoApiTokenUrl)) {
          return { ok: true, json: async () => mockToken };
        }
        if (url.includes(`${aikidoApiAccountsUrl}?per_page=20&page=0`)) {
          return { ok: true, json: async () => accounts };
        }
        if (url.includes(`${aikidoApiAccountsUrl}?per_page=20&page=1`)) {
          return { ok: true, json: async () => [] };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      const result = await api.getAccounts();

      expect(result).toHaveLength(totalItems);
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 for token, 2 for accounts pages
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiAccountsUrl}?per_page=20&page=0`),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiAccountsUrl}?per_page=20&page=1`),
        expect.anything(),
      );
    });

    it('should handle one more than the page limit number of results', async () => {
      const totalItems = perPageLimit + 1;
      const page1Accounts = generateMockAccounts(perPageLimit);
      const page2Accounts = generateMockAccounts(1).map(a => ({
        ...a,
        id: totalItems,
        name: `Test Account ${totalItems}`,
      }));

      (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url.includes(aikidoApiTokenUrl)) {
          return { ok: true, json: async () => mockToken };
        }
        if (url.includes(`${aikidoApiAccountsUrl}?per_page=20&page=0`)) {
          return { ok: true, json: async () => page1Accounts };
        }
        if (url.includes(`${aikidoApiAccountsUrl}?per_page=20&page=1`)) {
          return { ok: true, json: async () => page2Accounts };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      const result = await api.getAccounts();

      expect(result).toHaveLength(totalItems);
      expect(result[totalItems - 1].id).toBe(totalItems);
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 for token, 2 for accounts pages
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiAccountsUrl}?per_page=20&page=0`),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiAccountsUrl}?per_page=20&page=1`),
        expect.anything(),
      );
    });
  });

  // Add tests for specific cache invalidation behavior
  describe('cache invalidation', () => {
    it('should refetch accounts after clearing accounts cache', async () => {
      // First call - fetch and cache
      mockCache.get.mockReturnValue(undefined);
      await api.getAccounts();

      // Verify initial fetch happened
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiAccountsUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledTimes(2); // token + accounts

      // Clear mocks and setup cache hit
      jest.clearAllMocks();
      mockCache.get.mockReturnValueOnce(mockAccounts);

      // Second call - should use cache
      await api.getAccounts();
      expect(global.fetch).not.toHaveBeenCalled();

      // Clear accounts cache
      jest.clearAllMocks();
      mockCache.get.mockReturnValue(undefined);
      api.clearAccountsCache();

      // Third call - should fetch again
      await api.getAccounts();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiAccountsUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledTimes(1); // accounts fetch only
      expect(mockCache.set).toHaveBeenCalledWith('accounts_', mockAccounts);
    });

    it('should refetch repos after clearing repos cache', async () => {
      const accountId = 1;

      // First call - fetch and cache
      mockCache.get.mockReturnValue(undefined);
      await api.getRepos(accountId);

      // Verify initial fetch happened
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiReposUrl}?account_id=${accountId}`),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledTimes(2); // token + repos

      // Clear mocks and setup cache hit
      jest.clearAllMocks();
      mockCache.get.mockReturnValueOnce(mockRepos);

      // Second call - should use cache
      await api.getRepos(accountId);
      expect(global.fetch).not.toHaveBeenCalled();

      // Clear repos cache
      jest.clearAllMocks();
      mockCache.get.mockReturnValue(undefined);
      api.clearReposCache(accountId);

      // Third call - should fetch again
      await api.getRepos(accountId);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${aikidoApiReposUrl}?account_id=${accountId}`),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledTimes(1); // repos fetch only
      expect(mockCache.set).toHaveBeenCalledWith('repos_1', mockRepos);
    });

    it('should refetch insights after clearing insights cache', async () => {
      const accountId = 1;

      // First call - fetch and cache
      mockCache.get.mockReturnValue(undefined);
      await api.getAccountInsights(accountId);

      // Verify the API calls
      // Note that after the first call the token is cached
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiInsightsUrl),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledTimes(2); // token + insights

      // Clear mocks and setup cache hit
      jest.clearAllMocks();
      mockCache.get.mockReturnValueOnce(mockInsights);

      // Second call - should use cache
      await api.getAccountInsights(accountId);
      expect(global.fetch).not.toHaveBeenCalled();

      // Clear insights cache
      jest.clearAllMocks();
      mockCache.get.mockReturnValue(undefined);
      api.clearInsightsCache(accountId);

      // Third call - should fetch again
      await api.getAccountInsights(accountId);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `${aikidoApiInsightsUrl}?account_id=${accountId}`,
        ),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledTimes(1); // insights fetch only
      expect(mockCache.set).toHaveBeenCalledWith('insights_1', mockInsights);
    });
  });

  describe('automatic cache invalidation', () => {
    it('should automatically invalidate cache after TTL expires', async () => {
      jest.useFakeTimers();

      // Create an API instance with a short 1-second TTL
      const shortTtlApi = new AikidoApi(
        mockClientId,
        mockAuthSecret,
        mockLogger,
        1,
      );

      // First call - should fetch and cache
      mockCache.get.mockReturnValueOnce(undefined); // Cache miss
      const accounts1 = await shortTtlApi.getAccounts();
      expect(accounts1).toEqual(mockAccounts);
      expect(mockCache.set).toHaveBeenCalledWith('accounts_', mockAccounts);

      // Reset fetch mock to track new calls
      jest.clearAllMocks();

      // Second call immediately after - should use cache
      mockCache.get.mockReturnValueOnce(mockAccounts); // Cache hit
      const accounts2 = await shortTtlApi.getAccounts();
      expect(accounts2).toEqual(mockAccounts);
      expect(global.fetch).not.toHaveBeenCalled(); // No API call needed

      // Advance time by 1.5 seconds (past the TTL)
      jest.advanceTimersByTime(1500);

      // Reset fetch mock again
      jest.clearAllMocks();

      // Third call after TTL expiration - should fetch again
      const accounts3 = await shortTtlApi.getAccounts();
      expect(accounts3).toEqual(mockAccounts);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiAccountsUrl),
        expect.anything(),
      );
      expect(mockCache.set).toHaveBeenCalledWith('accounts_', mockAccounts);

      jest.useRealTimers();
    });
  });

  describe('automatic token invalidation', () => {
    it('should automatically invalidate token after TTL expires', async () => {
      // First API call - should fetch a token
      mockCache.get.mockReturnValue(undefined);
      await api.getAccounts();

      // Verify token was requested
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );

      jest.clearAllMocks();

      // Second call immediately after - should reuse token
      await api.getAccounts();

      // Token should not be fetched again for the immediate second call
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );

      jest.clearAllMocks();

      // Simulate token expiration by setting the token's expires_in to a past time
      (api as any).token = {
        ...mockToken,
        expires_in: Math.floor(Date.now() / 1000),
      };

      // Third call after token expiration - should fetch a new token
      await api.getAccounts();

      // Should have made a new token request
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(aikidoApiTokenUrl),
        expect.anything(),
      );
    });
  });

  describe('convertIssuesToInsights', () => {
    it('should convert empty issues array to empty insights', () => {
      const issues: any[] = [];
      const result = (api as any).convertIssuesToInsights(issues);

      expect(result).toEqual({});
    });

    it('should convert single issue to insights with correct count', () => {
      const issues = [
        {
          id: 1,
          type: 'open_source',
          severity: 'critical' as const,
          status: 'open' as const,
          affected_file: 'package.json',
          first_detected_at: 1234567890,
        },
      ];

      const result = (api as any).convertIssuesToInsights(issues);

      expect(result).toEqual({
        open_source: {
          critical: 1,
          high: 0,
          medium: 0,
          low: 0,
        },
      });
    });

    it('should convert multiple issues of same type but different severities', () => {
      const issues = [
        {
          id: 1,
          type: 'sast',
          severity: 'critical' as const,
          status: 'open' as const,
          affected_file: 'src/app.js',
          first_detected_at: 1234567890,
        },
        {
          id: 2,
          type: 'sast',
          severity: 'high' as const,
          status: 'open' as const,
          affected_file: 'src/utils.js',
          first_detected_at: 1234567891,
        },
        {
          id: 3,
          type: 'sast',
          severity: 'medium' as const,
          status: 'open' as const,
          affected_file: 'src/helpers.js',
          first_detected_at: 1234567892,
        },
        {
          id: 4,
          type: 'sast',
          severity: 'low' as const,
          status: 'open' as const,
          affected_file: 'src/config.js',
          first_detected_at: 1234567893,
        },
      ];

      const result = (api as any).convertIssuesToInsights(issues);

      expect(result).toEqual({
        sast: {
          critical: 1,
          high: 1,
          medium: 1,
          low: 1,
        },
      });
    });

    it('should convert multiple issues of different types', () => {
      const issues = [
        {
          id: 1,
          type: 'open_source',
          severity: 'critical' as const,
          status: 'open' as const,
          affected_file: 'package.json',
          first_detected_at: 1234567890,
        },
        {
          id: 2,
          type: 'leaked_secret',
          severity: 'high' as const,
          status: 'open' as const,
          affected_file: '.env',
          first_detected_at: 1234567891,
        },
        {
          id: 3,
          type: 'iac',
          severity: 'medium' as const,
          status: 'open' as const,
          affected_file: 'terraform/main.tf',
          first_detected_at: 1234567892,
        },
      ];

      const result = (api as any).convertIssuesToInsights(issues);

      expect(result).toEqual({
        open_source: {
          critical: 1,
          high: 0,
          medium: 0,
          low: 0,
        },
        leaked_secret: {
          critical: 0,
          high: 1,
          medium: 0,
          low: 0,
        },
        iac: {
          critical: 0,
          high: 0,
          medium: 1,
          low: 0,
        },
      });
    });

    it('should handle multiple issues of same type and severity', () => {
      const issues = [
        {
          id: 1,
          type: 'cloud',
          severity: 'high' as const,
          status: 'open' as const,
          affected_file: 'config/cloud.yaml',
          first_detected_at: 1234567890,
        },
        {
          id: 2,
          type: 'cloud',
          severity: 'high' as const,
          status: 'open' as const,
          affected_file: 'config/security.yaml',
          first_detected_at: 1234567891,
        },
        {
          id: 3,
          type: 'cloud',
          severity: 'high' as const,
          status: 'open' as const,
          affected_file: 'config/network.yaml',
          first_detected_at: 1234567892,
        },
      ];

      const result = (api as any).convertIssuesToInsights(issues);

      expect(result).toEqual({
        cloud: {
          critical: 0,
          high: 3,
          medium: 0,
          low: 0,
        },
      });
    });

    it('should handle all supported issue types', () => {
      const issues = [
        {
          id: 1,
          type: 'open_source',
          severity: 'critical' as const,
          status: 'open' as const,
          affected_file: 'package.json',
          first_detected_at: 1234567890,
        },
        {
          id: 2,
          type: 'leaked_secret',
          severity: 'high' as const,
          status: 'open' as const,
          affected_file: '.env',
          first_detected_at: 1234567891,
        },
        {
          id: 3,
          type: 'cloud',
          severity: 'medium' as const,
          status: 'open' as const,
          affected_file: 'cloud-config.yaml',
          first_detected_at: 1234567892,
        },
        {
          id: 4,
          type: 'sast',
          severity: 'low' as const,
          status: 'open' as const,
          affected_file: 'src/app.js',
          first_detected_at: 1234567893,
        },
        {
          id: 5,
          type: 'iac',
          severity: 'medium' as const,
          status: 'open' as const,
          affected_file: 'terraform/main.tf',
          first_detected_at: 1234567894,
        },
        {
          id: 6,
          type: 'surface_monitoring',
          severity: 'low' as const,
          status: 'open' as const,
          affected_file: 'monitoring/alerts.yaml',
          first_detected_at: 1234567895,
        },
        {
          id: 7,
          type: 'malware',
          severity: 'critical' as const,
          status: 'open' as const,
          affected_file: 'suspicious-file.exe',
          first_detected_at: 1234567896,
        },
        {
          id: 8,
          type: 'eol',
          severity: 'medium' as const,
          status: 'open' as const,
          affected_file: 'Dockerfile',
          first_detected_at: 1234567897,
        },
        {
          id: 9,
          type: 'mobile',
          severity: 'high' as const,
          status: 'open' as const,
          affected_file: 'mobile/app.js',
          first_detected_at: 1234567898,
        },
      ];

      const result = (api as any).convertIssuesToInsights(issues);

      expect(result).toEqual({
        open_source: {
          critical: 1,
          high: 0,
          medium: 0,
          low: 0,
        },
        leaked_secret: {
          critical: 0,
          high: 1,
          medium: 0,
          low: 0,
        },
        cloud: {
          critical: 0,
          high: 0,
          medium: 1,
          low: 0,
        },
        sast: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 1,
        },
        iac: {
          critical: 0,
          high: 0,
          medium: 1,
          low: 0,
        },
        surface_monitoring: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 1,
        },
        malware: {
          critical: 1,
          high: 0,
          medium: 0,
          low: 0,
        },
        eol: {
          critical: 0,
          high: 0,
          medium: 1,
          low: 0,
        },
        mobile: {
          critical: 0,
          high: 1,
          medium: 0,
          low: 0,
        },
      });
    });

    it('should handle complex mixed scenario with multiple issues', () => {
      const issues = [
        // Multiple open_source issues
        {
          id: 1,
          type: 'open_source',
          severity: 'critical' as const,
          status: 'open' as const,
          affected_file: 'package.json',
          first_detected_at: 1234567890,
        },
        {
          id: 2,
          type: 'open_source',
          severity: 'critical' as const,
          status: 'open' as const,
          affected_file: 'yarn.lock',
          first_detected_at: 1234567891,
        },
        {
          id: 3,
          type: 'open_source',
          severity: 'high' as const,
          status: 'open' as const,
          affected_file: 'requirements.txt',
          first_detected_at: 1234567892,
        },
        // Multiple SAST issues
        {
          id: 4,
          type: 'sast',
          severity: 'medium' as const,
          status: 'open' as const,
          affected_file: 'src/auth.js',
          first_detected_at: 1234567893,
        },
        {
          id: 5,
          type: 'sast',
          severity: 'medium' as const,
          status: 'open' as const,
          affected_file: 'src/validation.js',
          first_detected_at: 1234567894,
        },
        {
          id: 6,
          type: 'sast',
          severity: 'low' as const,
          status: 'open' as const,
          affected_file: 'src/utils.js',
          first_detected_at: 1234567895,
        },
        // Single leaked secret issue
        {
          id: 7,
          type: 'leaked_secret',
          severity: 'high' as const,
          status: 'open' as const,
          affected_file: 'config/secrets.env',
          first_detected_at: 1234567896,
        },
      ];

      const result = (api as any).convertIssuesToInsights(issues);

      expect(result).toEqual({
        open_source: {
          critical: 2,
          high: 1,
          medium: 0,
          low: 0,
        },
        sast: {
          critical: 0,
          high: 0,
          medium: 2,
          low: 1,
        },
        leaked_secret: {
          critical: 0,
          high: 1,
          medium: 0,
          low: 0,
        },
      });
    });
  });
});
