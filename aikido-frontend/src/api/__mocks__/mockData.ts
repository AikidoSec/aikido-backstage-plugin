/**
 * Mock data for the Aikido API client
 */

export const mockInsightsData: { [key: string]: any } = {
  'https://github.com/example/repo1': {
    cloud: {
      critical: 2,
      high: 5,
      medium: 10,
      low: 8,
    },
    leaked_secret: {
      critical: 1,
      high: 0,
      medium: 0,
      low: 0,
    },
    sast: {
      critical: 0,
      high: 3,
      medium: 7,
      low: 12,
    },
  },
  'https://gitlab.com/example/repo2': {
    cloud: {
      critical: 0,
      high: 2,
      medium: 6,
      low: 9,
    },
    vulnerability: {
      critical: 1,
      high: 4,
      medium: 8,
      low: 15,
    },
  },
};
