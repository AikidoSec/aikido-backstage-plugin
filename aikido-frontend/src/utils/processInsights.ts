import { ProcessedInsights } from '../api/types';
import {
  AikidoCommonObjectInsights,
  AikidoCommonAggregatedInsights,
  AikidoCommonInsights,
} from '@internal/backstage-plugin-aikido-common';

/**
 * Calculate aggregated insights from a single repository
 */
export function calculateRepoAggregates(
  insights: AikidoCommonInsights,
): AikidoCommonAggregatedInsights {
  const result: AikidoCommonAggregatedInsights = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  };

  if (!insights || typeof insights !== 'object') {
    // eslint-disable-next-line no-console
    console.warn('[calculateRepoAggregates] Invalid insights object');
    return result;
  }

  // Process each category
  Object.entries(insights).forEach(([categoryName, category]) => {
    if (!category || typeof category !== 'object') {
      // eslint-disable-next-line no-console
      console.warn(
        `[calculateRepoAggregates] Invalid category for ${categoryName}`,
      );
      return;
    }

    if (
      'critical' in category ||
      'high' in category ||
      'medium' in category ||
      'low' in category
    ) {
      // Direct count structure
      result.critical +=
        typeof category.critical === 'number' ? category.critical : 0;
      result.high += typeof category.high === 'number' ? category.high : 0;
      result.medium +=
        typeof category.medium === 'number' ? category.medium : 0;
      result.low += typeof category.low === 'number' ? category.low : 0;
    } else if ('items' in category && Array.isArray((category as any).items)) {
      (category as any).items.forEach((item: any) => {
        if (item && typeof item === 'object' && 'severity' in item) {
          const severity = item.severity?.toLowerCase();
          if (severity === 'critical') result.critical++;
          else if (severity === 'high') result.high++;
          else if (severity === 'medium') result.medium++;
          else if (severity === 'low') result.low++;
        }
      });
    } else if (
      'count' in category &&
      typeof (category as any).count === 'number'
    ) {
      // Default to medium severity if we just have a count without severities
      result.medium += (category as any).count;
    }
  });

  result.total = result.critical + result.high + result.medium + result.low;
  return result;
}

/**
 * Process raw Aikido insights data into a format suitable for display
 */
export function processInsights(rawInsightsData: {
  [key: string]: AikidoCommonObjectInsights;
}): ProcessedInsights {
  if (!rawInsightsData || typeof rawInsightsData !== 'object') {
    // eslint-disable-next-line no-console
    console.warn(
      '[processInsights] Warning: Invalid insights data (not an object)',
    );

    return {
      aggregated: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      },
      byRepo: [],
    };
  }

  if (Object.keys(rawInsightsData).length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[processInsights] Warning: Empty insights data (no repos)');

    return {
      aggregated: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      },
      byRepo: [],
    };
  }

  const aggregated: AikidoCommonAggregatedInsights = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  };

  const byRepo: AikidoCommonObjectInsights[] = Object.entries(
    rawInsightsData,
  ).map(([, entityData]) => {
    const insights = entityData.insights;
    const repoAggregated = calculateRepoAggregates(insights);

    aggregated.critical += repoAggregated.critical;
    aggregated.high += repoAggregated.high;
    aggregated.medium += repoAggregated.medium;
    aggregated.low += repoAggregated.low;
    aggregated.total += repoAggregated.total;

    return {
      insights: insights || {},
      aggregated: repoAggregated,
      objectType: entityData.objectType,
      repoId: entityData.repoId,
      accountId: entityData.accountId,
      repoUrl: entityData.repoUrl,
    };
  });

  const result = {
    aggregated,
    byRepo,
  };

  return result;
}
