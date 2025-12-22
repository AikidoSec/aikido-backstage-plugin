import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useAsyncRetry } from 'react-use';
import { aikidoApiRef } from '../api';
import { ProcessedInsights } from '../api/types';
import { getAikidoRequestFromEntity } from '../utils';
import { processInsights } from '../utils/processInsights';

/**
 * Hook to fetch Aikido insights data for the current entity using useAsyncRetry.
 */
export function useAikidoInsights() {
  const { entity } = useEntity();
  const aikidoApi = useApi(aikidoApiRef);

  const {
    value: insightsData,
    loading,
    error,
    retry: refresh,
  } = useAsyncRetry(async (): Promise<ProcessedInsights | undefined> => {
    const request = getAikidoRequestFromEntity(entity);
    if (
      !request.repos?.length &&
      !request.account_ids?.length &&
      !request.repo_ids?.length
    ) {
      return undefined;
    }

    const response = await aikidoApi.getInsights(request);

    if (!response || typeof response !== 'object') {
      throw new Error(
        `Invalid response format: expected an object but received ${typeof response}`,
      );
    }

    if (Object.keys(response).length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[useAikidoInsights] No insights data received');
      return undefined;
    }

    const processed = processInsights(response);

    return processed;
  }, [entity, aikidoApi]);

  const request = getAikidoRequestFromEntity(entity);

  return {
    loading,
    error,
    insightsData,
    repos: request.repos || [],
    refresh,
  };
}
