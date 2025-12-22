import { Entity } from '@backstage/catalog-model';

// Constants for annotation keys
export const AIKIDO_ACCOUNT_IDS = 'aikido.dev/account-ids';
export const AIKIDO_REPO_IDS = 'aikido.dev/repo-ids';
export const AIKIDO_WORKSPACE_IDS = 'aikido.dev/workspace-ids';
export const GITHUB_REPO_ANNOTATION = 'github.com/project-slug';
export const GITLAB_REPO_ANNOTATION = 'gitlab.com/project-slug';

/**
 * Extracts Aikido-related request data from an entity's annotations.
 */
export function getAikidoRequestFromEntity(entity: Entity): {
  repos?: string[];
  account_ids?: number[];
  repo_ids?: number[];
} {
  const annotations = entity.metadata.annotations || {};
  const request: {
    repos?: string[];
    account_ids?: number[];
    repo_ids?: number[];
  } = {};

  const repos: string[] = [];
  if (annotations[GITHUB_REPO_ANNOTATION]) {
    repos.push(`github.com/${annotations[GITHUB_REPO_ANNOTATION]}.git`);
  }
  if (annotations[GITLAB_REPO_ANNOTATION]) {
    const gitlabInstance = annotations['gitlab.com/instance'] || 'gitlab.com';
    repos.push(`${gitlabInstance}/${annotations[GITLAB_REPO_ANNOTATION]}.git`);
  }

  if (repos.length > 0) {
    request.repos = repos;
  }

  if (annotations[AIKIDO_ACCOUNT_IDS]) {
    request.account_ids = annotations[AIKIDO_ACCOUNT_IDS].split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));
  }

  if (annotations[AIKIDO_REPO_IDS]) {
    request.repo_ids = annotations[AIKIDO_REPO_IDS].split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));
  }

  return request;
}

/**
 * Checks if an entity has any Aikido-related or SCM annotations.
 */
export function hasAikidoOrScmAnnotations(entity: Entity): boolean {
  const annotations = entity.metadata.annotations || {};
  const relevantKeys = [
    AIKIDO_ACCOUNT_IDS,
    AIKIDO_REPO_IDS,
    AIKIDO_WORKSPACE_IDS,
    GITHUB_REPO_ANNOTATION,
    GITLAB_REPO_ANNOTATION,
  ];

  return relevantKeys.some(key => Boolean(annotations[key]));
}

/**
 * Gets the extracted repo name from a full repository URL.
 */
export function getRepoDisplayName(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // For GitHub/GitLab URLs, return 'owner/repo'
    if (pathParts.length >= 2) {
      return `${pathParts[0]}/${pathParts[1]}`;
    }

    // Fallback to just the pathname
    return url.pathname.replace(/^\//, '');
  } catch (e) {
    // If it's not a valid URL, just return as-is
    return repoUrl;
  }
}
