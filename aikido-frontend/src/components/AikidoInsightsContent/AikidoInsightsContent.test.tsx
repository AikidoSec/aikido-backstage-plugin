import { ReactNode } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AikidoInsightsContent } from './AikidoInsightsContent';
import { TestApiProvider } from '@backstage/test-utils';
import { aikidoApiRef } from '../../api';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { errorApiRef } from '@backstage/core-plugin-api';

// Mock the components that use Translation API to avoid errors
jest.mock('@backstage/core-components', () => {
  const original = jest.requireActual('@backstage/core-components');
  return {
    ...original,
    SupportButton: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    ContentHeader: ({
      title,
      description,
    }: {
      title: string;
      description?: ReactNode;
    }) => (
      <div>
        <div>{title}</div>
        {description && <div>{description}</div>}
      </div>
    ),
    Table: ({
      title,
      data,
      columns,
    }: {
      title: string;
      data: any[];
      columns: any[];
    }) => (
      <div data-testid="table">
        <div>{title}</div>
        <table>
          <thead>
            <tr>
              {columns.map((col: any, idx: number) => (
                <th key={idx}>{col.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, rowIdx: number) => (
              <tr key={rowIdx}>
                {columns.map((col: any, colIdx: number) => (
                  <td key={colIdx}>
                    {col.render ? col.render(row) : row[col.field]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
      'github.com/project-slug': 'org/repo1',
      'gitlab.com/project-slug': 'org/repo2',
    },
  },
  spec: {},
};

// Mock Aikido API
const mockAikidoApi = {
  getInsights: jest.fn(),
};

// Mock useAikidoInsights hook
jest.mock('../../hooks/useAikidoInsights', () => ({
  useAikidoInsights: jest.fn(),
}));

// Import the mocked hook
import { useAikidoInsights } from '../../hooks/useAikidoInsights';

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
        <AikidoInsightsContent />
      </EntityProvider>
    </TestApiProvider>,
  );
};

describe('AikidoInsightsContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a loading state initially', async () => {
    // Set up the mock return value for useAikidoInsights to show loading state
    const mockUseAikidoInsights = useAikidoInsights as jest.Mock;
    mockUseAikidoInsights.mockReturnValue({
      loading: true,
      error: null,
      insightsData: undefined,
      repos: ['https://github.com/org/repo1'],
      refresh: jest.fn(),
    });

    renderWithProviders();

    expect(screen.getByTestId('progress')).toBeInTheDocument();
    expect(
      screen.getByText('Loading security insights...'),
    ).toBeInTheDocument();
  });

  it('should render aggregated insights data and tabs when loaded', async () => {
    // Set up the mock return value for useAikidoInsights
    const mockUseAikidoInsights = useAikidoInsights as jest.Mock;

    // Calculate expected aggregated values based on our mock data
    const expectedCritical = 6; // 1+2+3+0 from all repos and categories
    const expectedHigh = 5; // 2+1+0+2
    const expectedMedium = 7; // 3+0+1+3
    const expectedLow = 8; // 4+1+2+1
    const expectedTotal = 26; // sum of all
    const expectedRepoCount = 2; // github and gitlab repos

    mockUseAikidoInsights.mockReturnValue({
      loading: false,
      error: null,
      insightsData: {
        aggregated: {
          critical: expectedCritical,
          high: expectedHigh,
          medium: expectedMedium,
          low: expectedLow,
          total: expectedTotal,
        },
        byRepo: [
          {
            objectType: 'repo',
            repoId: 1,
            accountId: 100,
            repoUrl: 'https://github.com/org/repo1',
            insights: {
              cloud: { critical: 1, high: 2, medium: 3, low: 4 },
              sast: { critical: 2, high: 1, medium: 0, low: 1 },
            },
            aggregated: {
              critical: 3,
              high: 3,
              medium: 3,
              low: 5,
              total: 14,
            },
          },
          {
            objectType: 'repo',
            repoId: 2,
            accountId: 100,
            repoUrl: 'https://gitlab.com/org/repo2',
            insights: {
              leaked_secret: { critical: 3, high: 0, medium: 1, low: 2 },
              vulnerability: { critical: 0, high: 2, medium: 3, low: 1 },
            },
            aggregated: {
              critical: 3,
              high: 2,
              medium: 4,
              low: 3,
              total: 12,
            },
          },
        ],
      },
      repos: ['https://github.com/org/repo1', 'https://gitlab.com/org/repo2'],
      refresh: jest.fn(),
    });

    const { container } = renderWithProviders();

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText('Loading security insights...'),
      ).not.toBeInTheDocument();
    });

    // Check for title
    expect(screen.getByText('Aikido Security Insights')).toBeInTheDocument();

    // Verify Overview card contents
    // Check aggregated counts display correctly as chips
    const criticalChip = screen.getByText(`${expectedCritical} Critical`);
    expect(criticalChip).toBeInTheDocument();

    const highChip = screen.getByText(`${expectedHigh} High`);
    expect(highChip).toBeInTheDocument();

    const mediumChip = screen.getByText(`${expectedMedium} Medium`);
    expect(mediumChip).toBeInTheDocument();

    const lowChip = screen.getByText(`${expectedLow} Low`);
    expect(lowChip).toBeInTheDocument();

    // Check summary text
    expect(
      screen.getByText(
        `${expectedTotal} total issues found across ${expectedRepoCount} entries`,
      ),
    ).toBeInTheDocument();

    // Verify repository tabs are rendered
    const tab1 = screen.getByRole('tab', { name: /repo1/i });
    expect(tab1).toBeInTheDocument();

    const tab2 = screen.getByRole('tab', { name: /repo2/i });
    expect(tab2).toBeInTheDocument();

    // Verify table is rendered for the active tab (first tab by default)
    const table = container.querySelector('[data-testid="table"]');
    expect(table).toBeInTheDocument();
    expect(table?.textContent).toContain('repo1');

    // Verify category column in the table
    expect(table?.textContent).toContain('cloud');
    expect(table?.textContent).toContain('sast');

    // Switch tabs and verify content changes
    fireEvent.click(tab2);

    // After tab switch, we should see repo2 data
    await waitFor(() => {
      const updatedTable = container.querySelector('[data-testid="table"]');
      expect(updatedTable?.textContent).toContain('repo2');
      expect(updatedTable?.textContent).toContain('leaked_secret');
      expect(updatedTable?.textContent).toContain('vulnerability');
    });
  });

  it('should render an error state when API call fails', async () => {
    // Set up the mock return value for useAikidoInsights to show error state
    const mockUseAikidoInsights = useAikidoInsights as jest.Mock;
    const apiError = new Error('API error');

    mockUseAikidoInsights.mockReturnValue({
      loading: false,
      error: apiError,
      insightsData: undefined,
      repos: ['https://github.com/org/repo1'],
      refresh: jest.fn(),
    });

    renderWithProviders();

    // Wait for loading state to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
    });

    // Title should still be rendered
    expect(screen.getByText('Aikido Security Insights')).toBeInTheDocument();

    // Check for the error message
    const errorElements = screen.getAllByText(content => {
      return content.includes('API error');
    });
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it('should render an empty state when no repos are found', async () => {
    // Create an entity without SCM annotations
    const entityWithoutRepos = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {},
      },
      spec: {},
    };

    // Mock the getInsights to not be called since there are no repos
    mockAikidoApi.getInsights.mockClear();

    render(
      <TestApiProvider
        apis={[
          [aikidoApiRef, mockAikidoApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <EntityProvider entity={entityWithoutRepos}>
          <AikidoInsightsContent />
        </EntityProvider>
      </TestApiProvider>,
    );

    // Expect to see the title
    expect(screen.getByText('Aikido Security Insights')).toBeInTheDocument();

    // Verify that the API was not called
    expect(mockAikidoApi.getInsights).not.toHaveBeenCalled();
  });
});
