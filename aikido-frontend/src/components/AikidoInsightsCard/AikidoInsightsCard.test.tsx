import { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AikidoInsightsCard } from './AikidoInsightsCard';
import { TestApiProvider } from '@backstage/test-utils';
import { aikidoApiRef } from '../../api';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { errorApiRef } from '@backstage/core-plugin-api';

// Mock Backstage components that might use the Translation API
jest.mock('@backstage/core-components', () => {
  const original = jest.requireActual('@backstage/core-components');
  return {
    ...original,
    InfoCard: ({
      title,
      children,
      action,
    }: {
      title: string;
      children: ReactNode;
      action?: ReactNode;
    }) => (
      <div className="mocked-info-card">
        <div className="info-card-header">
          <span>{title}</span>
          {action && <div className="info-card-action">{action}</div>}
        </div>
        <div className="info-card-content">{children}</div>
      </div>
    ),
  };
});

// Mock Entity
const mockEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'test-component',
    annotations: {
      'github.com/project-slug': 'org/repo',
    },
  },
  spec: {},
};

// Mock Aikido API
const mockAikidoApi = {
  getInsights: jest.fn(),
};

// Mock Error API
const mockErrorApi = {
  post: jest.fn(),
  error$: jest.fn().mockReturnValue({
    subscribe: jest.fn(),
  }),
};

// Helper function to render the component with necessary providers
const renderWithProviders = () => {
  return render(
    <TestApiProvider
      apis={[
        [aikidoApiRef, mockAikidoApi],
        [errorApiRef, mockErrorApi],
      ]}
    >
      <EntityProvider entity={mockEntity}>
        <AikidoInsightsCard />
      </EntityProvider>
    </TestApiProvider>,
  );
};

describe('AikidoInsightsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a loading state initially', async () => {
    mockAikidoApi.getInsights.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders();

    // Check for loading text instead of progressbar role
    expect(
      screen.getByText('Loading security insights...'),
    ).toBeInTheDocument();
  });

  it('should render aggregated insights data when loaded', async () => {
    const mockData = {
      'https://github.com/org/repo': {
        objectType: 'repo',
        accountId: 123,
        repoId: 456,
        repoUrl: 'https://github.com/org/repo',
        insights: {
          cloud: { critical: 1, high: 2, medium: 3, low: 4 },
          sast: { critical: 2, high: 1, medium: 0, low: 1 },
        },
      },
    };

    // Expected aggregated values based on our mock data
    const expectedCritical = 3; // 1 + 2
    const expectedHigh = 3; // 2 + 1
    const expectedMedium = 3; // 3 + 0
    const expectedLow = 5; // 4 + 1
    const expectedTotal = 14; // sum of all values

    mockAikidoApi.getInsights.mockResolvedValue(mockData);

    renderWithProviders();

    // Wait for data to load and loading indicator to disappear
    await waitFor(() => {
      expect(
        screen.queryByText('Loading security insights...'),
      ).not.toBeInTheDocument();
    });

    // Verify the title is rendered
    expect(screen.getByText('Aikido Security Insights')).toBeInTheDocument();

    // Check that all severity levels are rendered with correct counts
    // Use data-testid selectors instead of CSS classes
    const criticalSection = screen.getByTestId('insight-critical');
    expect(criticalSection).toBeInTheDocument();
    expect(criticalSection).toHaveTextContent(expectedCritical.toString());
    expect(criticalSection).toHaveTextContent('Critical');

    const highSection = screen.getByTestId('insight-high');
    expect(highSection).toBeInTheDocument();
    expect(highSection).toHaveTextContent(expectedHigh.toString());
    expect(highSection).toHaveTextContent('High');

    const mediumSection = screen.getByTestId('insight-medium');
    expect(mediumSection).toBeInTheDocument();
    expect(mediumSection).toHaveTextContent(expectedMedium.toString());
    expect(mediumSection).toHaveTextContent('Medium');

    const lowSection = screen.getByTestId('insight-low');
    expect(lowSection).toBeInTheDocument();
    expect(lowSection).toHaveTextContent(expectedLow.toString());
    expect(lowSection).toHaveTextContent('Low');

    // Check that the summary text shows the correct total
    expect(
      screen.getByText(`${expectedTotal} total issues found across 1 entries`),
    ).toBeInTheDocument();

    // Verify the refresh button is present and enabled
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  it('should render an error state when API call fails', async () => {
    mockAikidoApi.getInsights.mockRejectedValue(new Error('API error'));

    renderWithProviders();

    await waitFor(() => {
      expect(
        screen.queryByText('Loading security insights...'),
      ).not.toBeInTheDocument();
    });

    // Check for error text using partial match
    const errorElements = screen.getAllByText(content => {
      return content.includes('API error');
    });
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it('should render an empty state when no repos are found', async () => {
    // Create a entity without SCM annotations
    const entityWithoutRepos = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {},
      },
      spec: {},
    };

    render(
      <TestApiProvider
        apis={[
          [aikidoApiRef, mockAikidoApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <EntityProvider entity={entityWithoutRepos}>
          <AikidoInsightsCard />
        </EntityProvider>
      </TestApiProvider>,
    );

    // Check that the API was not called since there are no repos
    expect(mockAikidoApi.getInsights).not.toHaveBeenCalled();
  });

  it('should render a "no issues" message when all counts are zero', async () => {
    mockAikidoApi.getInsights.mockResolvedValue({
      'https://github.com/org/repo': {
        cloud: { critical: 0, high: 0, medium: 0, low: 0 },
        sast: { critical: 0, high: 0, medium: 0, low: 0 },
      },
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(
      screen.getByText('No security issues found! 🎉'),
    ).toBeInTheDocument();
  });
});
