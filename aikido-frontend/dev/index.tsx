import { createDevApp } from '@backstage/dev-utils';
import { aikidoFrontendPlugin, AikidoFrontendPage } from '../src/plugin';
import { aikidoApiRef, AikidoApi } from '../src/api';
import { AikidoCommonObjectInsights } from '@internal/backstage-plugin-aikido-common';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';

// Create a mock API implementation for development
class MockAikidoApiClient implements AikidoApi {
  async getInsights(): Promise<{
    [key: string]: AikidoCommonObjectInsights;
  }> {
    return {
      ['example/repo1']: {
        objectType: 'repo' as 'repo',
        repoId: 12345,
        accountId: 67890,
        repoUrl: 'https://github.com/example/repo1',
        insights: {
          open_source: {
            critical: 1,
            high: 8,
            medium: 14,
            low: 4,
          },
          cloud: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          leaked_secret: {
            critical: 0,
            high: 0,
            medium: 1,
            low: 0,
          },
          sast: {
            critical: 0,
            high: 5,
            medium: 11,
            low: 0,
          },
          iac: {
            critical: 0,
            high: 3,
            medium: 4,
            low: 0,
          },
          surface_monitoring: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          malware: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          eol: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          mobile: {
            critical: 0,
            high: 1,
            medium: 3,
            low: 0,
          },
          license: {
            critical: 0,
            high: 2,
            medium: 0,
            low: 0,
          },
        },
      },
      ['example/repo2']: {
        objectType: 'repo' as 'repo',
        repoId: 54321,
        accountId: 67890,
        repoUrl: 'https://github.com/example/repo2',
        insights: {
          open_source: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          cloud: {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4,
          },
          leaked_secret: {
            critical: 3,
            high: 0,
            medium: 1,
            low: 2,
          },
          sast: {
            critical: 2,
            high: 1,
            medium: 0,
            low: 1,
          },
        },
      },
    };
  }
  // Add other methods as needed
}

// Mock entity for development
const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'example-component',
    annotations: {
      'github.com/project-slug': 'example/repo1',
      'gitlab.com/project-slug': 'example/repo2',
      'gitlab.com/instance': 'gitlab.com',
    },
  },
  spec: {
    type: 'service',
    lifecycle: 'production',
    owner: 'team-a',
  },
};

// Create a dev app with the Aikido plugin and a mock API implementation
createDevApp()
  .registerPlugin(aikidoFrontendPlugin)
  .registerApi({
    api: aikidoApiRef,
    deps: {},
    factory: () => new MockAikidoApiClient(),
  })
  .addPage({
    element: (
      <EntityProvider entity={mockEntity}>
        <AikidoFrontendPage />
      </EntityProvider>
    ),
    title: 'Root Page',
    path: '/aikido-frontend',
  })
  .render();
