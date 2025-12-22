import { LoggerService } from '@backstage/backend-plugin-api';
import {
  AikidoAccount,
  AikidoRepo,
  AikidoToken,
  AikidoInsights,
  AikidoIssue,
} from './types';
import NodeCache from 'node-cache';

const userAgent = 'BackstageAikidoSync/1.0.0';
const perPageLimit = 20;
const maxRetries = 3; // we keep it low because this prolongs responsiveness on the frontend
export const aikidoApiBaseUrl = 'https://partners.aikido.dev/api';
export const aikidoApiVersion = 'v1';
export const aikidoApiTokenUrl = `${aikidoApiBaseUrl}/oauth/token`;
export const aikidoApiAccountsUrl = `${aikidoApiBaseUrl}/${aikidoApiVersion}/accounts`;
export const aikidoApiReposUrl = `${aikidoApiBaseUrl}/${aikidoApiVersion}/repos`;
export const aikidoApiInsightsUrl = `${aikidoApiBaseUrl}/${aikidoApiVersion}/insights/issue-counts/open`;
export const aikidoApiIssuesExportUrl = `${aikidoApiBaseUrl}/${aikidoApiVersion}/issues/export`;

export class AikidoApi {
  private readonly logger: LoggerService;
  private readonly clientId: string;
  private readonly authSecret: string;
  private token: AikidoToken | undefined;
  private cache: NodeCache;

  // Cache keys
  private static readonly ACCOUNTS_CACHE_KEY = 'accounts_';
  private static readonly REPOS_CACHE_PREFIX = 'repos_';
  private static readonly INSIGHTS_CACHE_PREFIX = 'insights_';
  private static readonly REPO_ISSUES_CACHE_PREFIX = 'repo_issues_';

  constructor(
    clientId: string,
    authSecret: string,
    logger: LoggerService,
    cacheTTLSeconds: number = 3600,
  ) {
    this.clientId = clientId;
    this.authSecret = authSecret;
    this.logger = logger;
    this.cache = new NodeCache({
      stdTTL: cacheTTLSeconds,
      checkperiod: Math.min(cacheTTLSeconds * 0.2, 600),
      useClones: false,
    });
  }

  private async getAccessToken(): Promise<string> {
    this.logger.debug('Getting access token from Aikido API');
    // Check if token exists and is not expired (with a 60-second buffer)
    if (
      this.token &&
      this.token.expires_in > Math.floor(Date.now() / 1000) + 60
    ) {
      this.logger.debug('Using cached access token from Aikido API');
      return this.token.access_token;
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        Authorization: `Basic ${Buffer.from(
          `${this.clientId}:${this.authSecret}`,
        ).toString('base64')}`,
      },
      body: '{"grant_type":"client_credentials"}',
    };

    const response = await this.fetchWithRetries(aikidoApiTokenUrl, options);

    this.logger.debug('Fetched access token from Aikido API');
    this.token = (await response.json()) as AikidoToken;

    const currentTime = Math.floor(Date.now() / 1000);
    this.token.expires_in += currentTime;

    return this.token.access_token;
  }

  async getAccounts(): Promise<AikidoAccount[]> {
    const cachedAccounts = this.cache.get<AikidoAccount[]>(
      AikidoApi.ACCOUNTS_CACHE_KEY,
    );
    if (cachedAccounts) {
      this.logger.debug('Using cached accounts from Aikido API');
      return cachedAccounts;
    }

    this.logger.debug('Fetching accounts from Aikido API');
    const accessToken = await this.getAccessToken();
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const accounts = await this.paginatedFetch<AikidoAccount>(
      aikidoApiAccountsUrl,
      {},
      options,
    );

    this.cache.set(AikidoApi.ACCOUNTS_CACHE_KEY, accounts);
    return accounts;
  }

  async getRepos(accountId: number): Promise<AikidoRepo[]> {
    const cacheKey = `${AikidoApi.REPOS_CACHE_PREFIX}${accountId}`;

    const cachedRepos = this.cache.get<AikidoRepo[]>(cacheKey);
    if (cachedRepos) {
      this.logger.debug(`Using cached repos for account ID: ${accountId}`);
      return cachedRepos;
    }

    this.logger.debug(`Fetching repos for account ID: ${accountId}`);
    const accessToken = await this.getAccessToken();
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const repos = await this.paginatedFetch<AikidoRepo>(
      aikidoApiReposUrl,
      { account_id: accountId },
      options,
    );

    this.cache.set(cacheKey, repos);
    return repos;
  }

  async getAccountInsights(accountId: number): Promise<AikidoInsights> {
    const cacheKey = `${AikidoApi.INSIGHTS_CACHE_PREFIX}${accountId}`;

    const cachedInsights = this.cache.get<AikidoInsights>(cacheKey);
    if (cachedInsights) {
      this.logger.debug(`Using cached insights for account ID: ${accountId}`);
      return cachedInsights;
    }

    this.logger.debug(`Fetching insights for account ID: ${accountId}`);
    const accessToken = await this.getAccessToken();
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const response = await this.fetchWithRetries(
      `${aikidoApiInsightsUrl}?account_id=${accountId}`,
      options,
    );

    const insights = (await response.json()) as AikidoInsights;
    this.cache.set(cacheKey, insights);
    return insights;
  }

  async getRepoInsights(repoId: number): Promise<AikidoInsights> {
    const cacheKey = `${AikidoApi.REPO_ISSUES_CACHE_PREFIX}${repoId}`;

    const cachedInsights = this.cache.get<AikidoInsights>(cacheKey);
    if (cachedInsights) {
      this.logger.debug(
        `Using cached repo issues insights for repo ID (${repoId}): ${JSON.stringify(cachedInsights)}`,
      );
      return cachedInsights;
    }

    this.logger.debug(`Fetching repo issues for repo ID: ${repoId}`);
    const accessToken = await this.getAccessToken();
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        Authorization: `Bearer ${accessToken}`,
      },
    };

    // TODO: Improve this, since this is not efficient:
    // Fetch all accounts, then their repos, and find the account for the repo
    const accounts = await this.getAccounts();
    let accountId: number | undefined;

    for (const account of accounts) {
      const repos = await this.getRepos(account.id);
      const repo = repos.find(r => r.id === repoId);
      if (repo) {
        accountId = account.id;
        break;
      }
    }

    if (!accountId) {
      throw new Error(`No account found for repo ID: ${repoId}`);
    }

    // Fetch issues for the specific repo, note: this will return only open issues
    const url = `${aikidoApiIssuesExportUrl}?account_id=${accountId}&format=json&filter_status=open&filter_code_repo_id=${repoId}`;
    const response = await this.fetchWithRetries(url, options);
    const issues = (await response.json()) as AikidoIssue[];

    const insights = this.convertIssuesToInsights(issues);
    this.cache.set(cacheKey, insights);
    this.logger.debug(
      `Generated insights for repo ID (${repoId}): ${JSON.stringify(insights)}`,
    );
    return insights;
  }

  private convertIssuesToInsights(issues: AikidoIssue[]): AikidoInsights {
    const insights: AikidoInsights = {};
    const seenGroupIds = new Set<number>();

    issues.forEach(issue => {
      // Issues can be grouped, so we need to handle duplicates
      if (issue.group_id && seenGroupIds.has(issue.group_id)) {
        this.logger.debug(
          `Skipping duplicate issue in group ${issue.group_id}`,
        );
        return;
      }

      const issueType = issue.type;

      if (issue.group_id) {
        seenGroupIds.add(issue.group_id);
      }

      if (!insights[issueType]) {
        insights[issueType] = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        };
      }
      insights[issueType][issue.severity]++;
    });

    return insights;
  }

  clearAccountsCache(): void {
    this.logger.debug('Clearing accounts cache');
    this.cache.del(AikidoApi.ACCOUNTS_CACHE_KEY);
  }

  clearReposCache(accountId?: number): void {
    if (accountId !== undefined) {
      this.logger.debug(`Clearing repos cache for account ID: ${accountId}`);
      this.cache.del(`${AikidoApi.REPOS_CACHE_PREFIX}${accountId}`);
    } else {
      this.logger.debug('Clearing all repos cache');
      const keys = this.cache
        .keys()
        .filter(key => key.startsWith(AikidoApi.REPOS_CACHE_PREFIX));
      this.cache.del(keys);
    }
  }

  clearInsightsCache(accountId?: number): void {
    if (accountId !== undefined) {
      this.logger.debug(`Clearing insights cache for account ID: ${accountId}`);
      this.cache.del(`${AikidoApi.INSIGHTS_CACHE_PREFIX}${accountId}`);
    } else {
      this.logger.debug('Clearing all insights cache');
      const keys = this.cache
        .keys()
        .filter(key => key.startsWith(AikidoApi.INSIGHTS_CACHE_PREFIX));
      this.cache.del(keys);
    }
  }

  clearRepoIssuesCache(repoId?: number): void {
    if (repoId !== undefined) {
      this.logger.debug(`Clearing repo issues cache for repo ID: ${repoId}`);
      this.cache.del(`${AikidoApi.REPO_ISSUES_CACHE_PREFIX}${repoId}`);
    } else {
      this.logger.debug('Clearing all repo issues cache');
      const keys = this.cache
        .keys()
        .filter(key => key.startsWith(AikidoApi.REPO_ISSUES_CACHE_PREFIX));
      this.cache.del(keys);
    }
  }

  clearAllCaches(): void {
    this.logger.debug('Clearing all caches');
    this.cache.flushAll();
  }

  private async fetchWithRetries(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    let response: Response | null = null;
    for (let r = 0; r < maxRetries; r++) {
      this.logger.debug(`Fetching ${url}`);
      response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      this.logger.debug(`Retrying (${r + 1}/${maxRetries})...`);
    }

    throw new Error(
      `Failed to fetch from Aikido API (${url}), ${response?.status} ${response?.statusText}`,
    );
  }

  private async paginatedFetch<T>(
    baseUrl: string,
    baseParams: Record<string, string | number>,
    options: RequestInit,
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 0;
    let hasMorePages = true;

    const urlParams = new URLSearchParams();
    for (const key in baseParams) {
      if (Object.prototype.hasOwnProperty.call(baseParams, key)) {
        urlParams.append(key, String(baseParams[key]));
      }
    }

    while (hasMorePages) {
      const pageParams = new URLSearchParams(urlParams);
      pageParams.append('per_page', String(perPageLimit));
      pageParams.append('page', String(page));

      const url = `${baseUrl}?${pageParams.toString()}`;
      this.logger.debug(`Fetching page ${page} from ${url}`);
      const response = await this.fetchWithRetries(url, options);

      const items = (await response.json()) as T[];
      allItems.push(...items);

      if (items.length < perPageLimit) {
        hasMorePages = false;
      } else {
        page++;
      }
    }
    return allItems;
  }
}
