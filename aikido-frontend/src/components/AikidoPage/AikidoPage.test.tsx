import { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { AikidoPage } from './AikidoPage';
import { TestApiProvider } from '@backstage/test-utils';
import { aikidoApiRef } from '../../api';
import { ThemeProvider } from '@material-ui/core/styles';
import { createTheme } from '@material-ui/core';
import { lightTheme } from '@backstage/theme';
import { configApiRef, errorApiRef } from '@backstage/core-plugin-api';

// Mock Backstage components that might use the Translation API
jest.mock('@backstage/core-components', () => {
  const original = jest.requireActual('@backstage/core-components');
  return {
    ...original,
    SupportButton: ({ children }: { children: ReactNode }) => (
      <div data-testid="support-button">{children}</div>
    ),
  };
});

// Mock Aikido API
const mockAikidoApi = {
  getInsights: jest.fn(),
};

// Mock Config API
const mockConfigApi = {
  getOptionalString: jest.fn(),
  getOptionalStringArray: jest.fn(),
  getOptionalConfig: jest.fn(),
  getOptionalConfigArray: jest.fn(),
  getOptionalNumber: jest.fn(),
  getOptionalBoolean: jest.fn(),
  getString: jest.fn(),
  getConfig: jest.fn(),
  getConfigArray: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
  has: jest.fn(),
  keys: jest.fn(),
};

// Mock Error API
const mockErrorApi = {
  post: jest.fn(),
  error$: jest.fn().mockReturnValue({
    subscribe: jest.fn(),
  }),
};

// Create a test theme that matches Backstage expectations
const testTheme = {
  ...createTheme({
    spacing: 8,
  }),
  ...lightTheme,
  getPageTheme: () => ({
    colors: {
      shadow: '#000',
      bgImage: '#fff',
    },
    fontColor: '#000',
    backgroundImage: 'linear-gradient(to right, #fff, #fff)',
  }),
};

describe('AikidoPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the page title and description', () => {
    render(
      <ThemeProvider theme={testTheme}>
        <TestApiProvider
          apis={[
            [aikidoApiRef, mockAikidoApi],
            [configApiRef, mockConfigApi],
            [errorApiRef, mockErrorApi],
          ]}
        >
          <AikidoPage />
        </TestApiProvider>
      </ThemeProvider>,
    );

    // Use more specific selectors for elements with duplicate text
    expect(
      screen.getByRole('heading', {
        name: 'Aikido Security Insights',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Security insights from Aikido'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('About Aikido Security Insights'),
    ).toBeInTheDocument();
  });

  it('should render the card and content demos', () => {
    render(
      <ThemeProvider theme={testTheme}>
        <TestApiProvider
          apis={[
            [aikidoApiRef, mockAikidoApi],
            [configApiRef, mockConfigApi],
            [errorApiRef, mockErrorApi],
          ]}
        >
          <AikidoPage />
        </TestApiProvider>
      </ThemeProvider>,
    );

    expect(screen.getByText('Card Component Demo')).toBeInTheDocument();
    expect(screen.getByText('Detailed View Demo')).toBeInTheDocument();
  });
});
