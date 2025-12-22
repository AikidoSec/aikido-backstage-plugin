import { AikidoApiClient } from './AikidoApiClient';
import { AikidoApiError } from './types';

describe('AikidoApiClient', () => {
  const mockDiscoveryApi = {
    getBaseUrl: jest
      .fn()
      .mockResolvedValue('http://backstage/api/aikido-api-client'),
  };

  const mockResponse = {
    'https://github.com/org/repo1': {
      cloud: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
      },
      sast: {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      },
    },
  };

  const mockFetchSuccess = {
    fetch: jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    }),
  };

  const mockFetchClientError = {
    fetch: jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue('Invalid request format'),
    }),
  };

  const mockFetchServerError = {
    fetch: jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: jest.fn().mockResolvedValue('Something went wrong'),
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch insights successfully', async () => {
    const client = new AikidoApiClient({
      discoveryApi: mockDiscoveryApi,
      fetchApi: mockFetchSuccess,
    });

    const repos = ['https://github.com/org/repo1'];
    const result = await client.getInsights({ repos });

    expect(mockDiscoveryApi.getBaseUrl).toHaveBeenCalledWith(
      'aikido-api-client',
    );
    expect(mockFetchSuccess.fetch).toHaveBeenCalledWith(
      'http://backstage/api/aikido-api-client/insights',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repos }),
      },
    );

    expect(result).toEqual(mockResponse);
  });

  it('should not retry on client errors (4xx)', async () => {
    const client = new AikidoApiClient({
      discoveryApi: mockDiscoveryApi,
      fetchApi: mockFetchClientError,
    });

    const repos = ['https://github.com/org/repo1'];

    await expect(client.getInsights({ repos })).rejects.toThrow(AikidoApiError);
    expect(mockFetchClientError.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on server errors (5xx)', async () => {
    // Mock implementation that counts attempts and simulates failures
    const mockFetchWithRetry = {
      fetch: jest
        .fn()
        // First attempt fails with 500
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: jest.fn().mockResolvedValue('Server error'),
        })
        // Second attempt fails with 500
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: jest.fn().mockResolvedValue('Server error'),
        })
        // Third attempt succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockResponse),
        }),
    };

    const client = new AikidoApiClient({
      discoveryApi: mockDiscoveryApi,
      fetchApi: mockFetchWithRetry,
      maxRetries: 2,
      retryDelay: 1, // Minimal delay for tests
    });

    const repos = ['https://github.com/org/repo1'];
    const result = await client.getInsights({ repos });

    expect(mockFetchWithRetry.fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual(mockResponse);
  });

  it('should fail after max retries', async () => {
    const client = new AikidoApiClient({
      discoveryApi: mockDiscoveryApi,
      fetchApi: mockFetchServerError,
      maxRetries: 1,
      retryDelay: 1, // Minimal delay for tests
    });

    const repos = ['https://github.com/org/repo1'];

    await expect(client.getInsights({ repos })).rejects.toThrow(
      'Failed to fetch insights',
    );
    expect(mockFetchServerError.fetch).toHaveBeenCalledTimes(2);
  });
});
