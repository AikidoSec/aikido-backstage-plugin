import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  createComponentExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { AikidoApiClient, aikidoApiRef } from './api';

export const aikidoFrontendPlugin = createPlugin({
  id: 'aikido-frontend',
  apis: [
    createApiFactory({
      api: aikidoApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new AikidoApiClient({
          discoveryApi,
          fetchApi,
        }),
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

export const AikidoFrontendPage = aikidoFrontendPlugin.provide(
  createRoutableExtension({
    name: 'AikidoFrontendPage',
    component: () => import('./components/AikidoPage').then(m => m.AikidoPage),
    mountPoint: rootRouteRef,
  }),
);

export const EntityAikidoInsightsCard = aikidoFrontendPlugin.provide(
  createComponentExtension({
    name: 'EntityAikidoInsightsCard',
    component: {
      lazy: () =>
        import('./components/AikidoInsightsCard').then(
          m => m.AikidoInsightsCard,
        ),
    },
  }),
);

export const EntityAikidoInsightsContent = aikidoFrontendPlugin.provide(
  createComponentExtension({
    name: 'EntityAikidoInsightsContent',
    component: {
      lazy: () =>
        import('./components/AikidoInsightsContent').then(
          m => m.AikidoInsightsContent,
        ),
    },
  }),
);
