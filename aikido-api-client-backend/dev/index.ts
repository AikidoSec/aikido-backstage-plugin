import { createBackend } from '@backstage/backend-defaults';
import { mockServices } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';

// TEMPLATE NOTE:
// This is the development setup for your plugin that wires up a
// minimal backend that can use both real and mocked plugins and services.
//
// Start up the backend by running `yarn start` in the package directory.
// Once it's up and running, try out the following requests:
//
// Get insights for repositories:
//
//   curl http://localhost:7007/api/aikido-api-client/insights -H 'Content-Type: application/json' -d '{"repos": ["https://github.com/example/repo"]}'
//   curl http://localhost:7007/api/aikido-api-client/insights -H 'Content-Type: application/json' -d '{"repos": ["https://github.com/example/repo1", "https://github.com/example/repo2"]}'
//
// Explicitly make an unauthenticated request, or with service auth:
//
//   curl http://localhost:7007/api/aikido-api-client/insights -H 'Content-Type: application/json' -d '{"repos": ["https://github.com/example/repo"]}' -H 'Authorization: Bearer mock-none-token'
//   curl http://localhost:7007/api/aikido-api-client/insights -H 'Content-Type: application/json' -d '{"repos": ["https://github.com/example/repo"]}' -H 'Authorization: Bearer mock-service-token'

const backend = createBackend();

// TEMPLATE NOTE:
// Mocking the auth and httpAuth service allows you to call your plugin API without
// having to authenticate.
//
// If you want to use real auth, you can install the following instead:
//   backend.add(import('@backstage/plugin-auth-backend'));
//   backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());

// Try to load config from rootConfig.json (see README for details), fallback to hardcoded values if it fails
let rootConfigData;
try {
  // Using Node.js file system to read the JSON file
  const fs = require('fs');
  const path = require('path');
  const configPath = path.resolve(__dirname, 'rootConfig.json');

  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    rootConfigData = JSON.parse(configContent);
    console.log('Using configuration from rootConfig.json');
  } else {
    throw new Error('rootConfig.json not found');
  }
} catch (error) {
  console.warn(`Failed to load rootConfig.json: ${(error as Error).message}`);
  console.log('Using fallback configuration');

  rootConfigData = {
    data: {
      aikido: {
        clientId: 'mock-client-id',
        authSecret: 'mock-auth-secret',
      },
    },
  };
}

// Add config with Aikido API credentials
backend.add(mockServices.rootConfig.factory(rootConfigData));

// TEMPLATE NOTE:
// Rather than using a real catalog you can use a mock with a fixed set of entities.
backend.add(
  catalogServiceMock.factory({
    entities: [
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'sample',
          title: 'Sample Component',
          annotations: {
            'github.com/project-slug': 'example/repo',
          },
        },
        spec: {
          type: 'service',
        },
      },
    ],
  }),
);

backend.add(import('../src'));

backend.start();
