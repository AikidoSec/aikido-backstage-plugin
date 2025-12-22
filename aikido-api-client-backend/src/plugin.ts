import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { aikidoApiService } from './services/aikidoApiService';

/**
 * aikidoApiClientPlugin backend plugin
 *
 * @public
 */
export const aikidoApiClientPlugin = createBackendPlugin({
  pluginId: 'aikido-api-client',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
      },
      async init({ logger, httpRouter, config, httpAuth }) {
        const service = await aikidoApiService({
          logger,
          config,
        });

        httpRouter.use(
          await createRouter({
            httpAuth,
            aikidoApiService: service,
          }),
        );
      },
    });
  },
});
