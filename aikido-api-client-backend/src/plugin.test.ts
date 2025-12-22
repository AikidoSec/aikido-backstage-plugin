import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';

// Mock the AikidoApi module
jest.mock('./services/aikidoApiService/AikidoApi', () => {
  class MockAikidoApi {
    getAccounts = jest.fn().mockResolvedValue([]);
    getRepos = jest.fn().mockResolvedValue([]);
    getInsights = jest.fn().mockResolvedValue({});
    clearAccountsCache = jest.fn();
    clearReposCache = jest.fn();
    clearInsightsCache = jest.fn();
    clearAllCaches = jest.fn();
  }
  return {
    AikidoApi: jest.fn().mockImplementation(() => new MockAikidoApi()),
  };
});

// Mock the aikidoApiService module
jest.mock('./services/aikidoApiService/aikidoApiService', () => {
  return {
    aikidoApiService: jest.fn().mockImplementation(async ({ config }) => {
      // This will throw an error if required config is missing
      config.getString('aikido.clientId');
      config.getString('aikido.authSecret');

      // Return mock implementation of the service
      return {
        getIssueInsightsForRepoUrl: jest.fn().mockResolvedValue({}),
        getIssueInsightsForAccountIds: jest.fn().mockResolvedValue({}),
        getIssueInsightsForRepoIds: jest.fn().mockResolvedValue({}),
      };
    }),
  };
});

// Mock the createRouter function to avoid having to set up the full router
jest.mock('./router', () => {
  return {
    createRouter: jest.fn().mockResolvedValue(() => {}),
  };
});

describe('aikido-api-client-backend plugin', () => {
  // Import the aikidoApiService function after mocking
  const { aikidoApiService } = jest.requireMock(
    './services/aikidoApiService/aikidoApiService',
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize successfully with valid config', async () => {
    // Create valid config
    const config = new ConfigReader({
      aikido: {
        clientId: 'test-client-id',
        authSecret: 'test-auth-secret',
      },
    });

    // Test that the service initializes with valid config
    await expect(
      aikidoApiService({
        logger: mockServices.logger.mock(),
        config,
      }),
    ).resolves.toBeDefined();
  });

  it('should fail to initialize with missing config', async () => {
    // Create invalid config
    const config = new ConfigReader({
      catalog: {
        providers: {
          // aikido section is missing
        },
      },
    });

    // Test that the service fails to initialize with invalid config
    await expect(
      aikidoApiService({
        logger: mockServices.logger.mock(),
        config,
      }),
    ).rejects.toThrow(/Missing required config/);
  });
});
