import { Entity } from '@backstage/catalog-model';
import {
  getAikidoRequestFromEntity,
  hasAikidoOrScmAnnotations,
  getRepoDisplayName,
  AIKIDO_WORKSPACE_IDS,
  AIKIDO_REPO_IDS,
  AIKIDO_ACCOUNT_IDS,
  GITHUB_REPO_ANNOTATION,
  GITLAB_REPO_ANNOTATION,
} from './index';
import { processInsights } from './processInsights';
import { AikidoCommonObjectInsights } from '@internal/backstage-plugin-aikido-common';

describe('Aikido Utils', () => {
  describe('getAikidoRequestFromEntity', () => {
    it('should return repo_ids from Aikido repo IDs annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            [`${AIKIDO_REPO_IDS}`]: '1, 2, 3',
          },
        },
        spec: {},
      };

      const result = getAikidoRequestFromEntity(entity);
      expect(result.repo_ids).toEqual([1, 2, 3]);
      expect(result.repos).toBeUndefined();
      expect(result.account_ids).toBeUndefined();
    });

    it('should return account_ids from Aikido account IDs annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            [`${AIKIDO_ACCOUNT_IDS}`]: '100, 200',
          },
        },
        spec: {},
      };

      const result = getAikidoRequestFromEntity(entity);
      expect(result.account_ids).toEqual([100, 200]);
      expect(result.repos).toBeUndefined();
      expect(result.repo_ids).toBeUndefined();
    });

    it('should return GitHub repo URL from GitHub annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            'github.com/project-slug': 'org/repo',
          },
        },
        spec: {},
      };

      const result = getAikidoRequestFromEntity(entity);
      expect(result.repos).toEqual(['github.com/org/repo.git']);
      expect(result.repo_ids).toBeUndefined();
      expect(result.account_ids).toBeUndefined();
    });

    it('should return GitLab repo URL from GitLab annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            [`${GITLAB_REPO_ANNOTATION}`]: 'org/repo',
          },
        },
        spec: {},
      };

      const result = getAikidoRequestFromEntity(entity);
      expect(result.repos).toEqual(['gitlab.com/org/repo.git']);
      expect(result.repo_ids).toBeUndefined();
      expect(result.account_ids).toBeUndefined();
    });

    it('should return GitLab repo URL with custom instance', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            [`${GITLAB_REPO_ANNOTATION}`]: 'org/repo',
            'gitlab.com/instance': 'gitlab.example.com',
          },
        },
        spec: {},
      };

      const result = getAikidoRequestFromEntity(entity);
      expect(result.repos).toEqual(['gitlab.example.com/org/repo.git']);
      expect(result.repo_ids).toBeUndefined();
      expect(result.account_ids).toBeUndefined();
    });

    it('should include both repo_ids and repos in the result', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            [`${AIKIDO_REPO_IDS}`]: '1, 2',
            [`${GITHUB_REPO_ANNOTATION}`]: 'org/repo',
          },
        },
        spec: {},
      };

      const result = getAikidoRequestFromEntity(entity);
      expect(result.repo_ids).toEqual([1, 2]);
      expect(result.repos).toEqual(['github.com/org/repo.git']);
      expect(result.account_ids).toBeUndefined();
    });

    it('should handle all annotation types simultaneously', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            [`${AIKIDO_REPO_IDS}`]: '1, 2',
            [`${AIKIDO_ACCOUNT_IDS}`]: '100, 200',
            [`${GITHUB_REPO_ANNOTATION}`]: 'org/repo',
            [`${GITLAB_REPO_ANNOTATION}`]: 'org/repo2',
          },
        },
        spec: {},
      };

      const result = getAikidoRequestFromEntity(entity);
      expect(result.repo_ids).toEqual([1, 2]);
      expect(result.account_ids).toEqual([100, 200]);
      expect(result.repos).toEqual([
        'github.com/org/repo.git',
        'gitlab.com/org/repo2.git',
      ]);
    });
  });

  describe('hasAikidoOrScmAnnotations', () => {
    it('should return true if entity has Aikido repo IDs annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            [`${AIKIDO_REPO_IDS}`]: 'repo1, repo2',
          },
        },
        spec: {},
      };

      expect(hasAikidoOrScmAnnotations(entity)).toBe(true);
    });

    it('should return true if entity has Aikido workspace IDs annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            [`${AIKIDO_WORKSPACE_IDS}`]: 'workspace1',
          },
        },
        spec: {},
      };

      expect(hasAikidoOrScmAnnotations(entity)).toBe(true);
    });

    it('should return true if entity has GitHub annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            'github.com/project-slug': 'org/repo',
          },
        },
        spec: {},
      };

      expect(hasAikidoOrScmAnnotations(entity)).toBe(true);
    });

    it('should return true if entity has GitLab annotation', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            'gitlab.com/project-slug': 'org/repo',
          },
        },
        spec: {},
      };

      expect(hasAikidoOrScmAnnotations(entity)).toBe(true);
    });

    it('should return false if entity has no relevant annotations', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'test',
          annotations: {
            'some-other/annotation': 'value',
          },
        },
        spec: {},
      };

      expect(hasAikidoOrScmAnnotations(entity)).toBe(false);
    });
  });

  describe('processInsights', () => {
    it('should process insights data correctly', () => {
      const insightsData: { [key: string]: AikidoCommonObjectInsights } = {
        repo1: {
          objectType: 'repo' as const,
          repoId: 1,
          accountId: 100,
          repoUrl: 'https://github.com/org/repo1',
          insights: {
            cloud: {
              critical: 1,
              high: 2,
              medium: 3,
              low: 4,
            },
            sast: {
              critical: 2,
              high: 3,
              medium: 4,
              low: 5,
            },
          },
        },
        repo2: {
          objectType: 'repo' as const,
          repoId: 2,
          accountId: 100,
          repoUrl: 'https://github.com/org/repo2',
          insights: {
            leaked_secret: {
              critical: 3,
              high: 0,
              medium: 1,
              low: 2,
            },
          },
        },
      };

      const result = processInsights(insightsData);

      expect(result.aggregated).toEqual({
        critical: 6,
        high: 5,
        medium: 8,
        low: 11,
        total: 30,
      });

      expect(result.byRepo).toHaveLength(2);

      expect(result.byRepo[0].repoUrl).toBe('https://github.com/org/repo1');
      expect(result.byRepo[0].aggregated).toEqual({
        critical: 3,
        high: 5,
        medium: 7,
        low: 9,
        total: 24,
      });

      expect(result.byRepo[1].repoUrl).toBe('https://github.com/org/repo2');
      expect(result.byRepo[1].aggregated).toEqual({
        critical: 3,
        high: 0,
        medium: 1,
        low: 2,
        total: 6,
      });
    });

    it('should handle empty insights data', () => {
      const insightsData: { [key: string]: AikidoCommonObjectInsights } = {};

      const result = processInsights(insightsData);

      expect(result.aggregated).toEqual({
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      });

      expect(result.byRepo).toHaveLength(0);
    });
  });

  describe('getRepoDisplayName', () => {
    it('should extract owner/repo from GitHub URL', () => {
      const url = 'https://github.com/org/repo';
      expect(getRepoDisplayName(url)).toBe('org/repo');
    });

    it('should extract owner/repo from GitLab URL', () => {
      const url = 'https://gitlab.com/org/repo';
      expect(getRepoDisplayName(url)).toBe('org/repo');
    });

    it('should handle custom GitLab instances', () => {
      const url = 'https://gitlab.example.com/org/repo';
      expect(getRepoDisplayName(url)).toBe('org/repo');
    });

    it('should handle nested GitLab group URLs', () => {
      const url = 'https://gitlab.com/group/subgroup/repo';
      expect(getRepoDisplayName(url)).toBe('group/subgroup');
    });

    it('should return the original string for non-URL inputs', () => {
      const nonUrl = 'not-a-url';
      expect(getRepoDisplayName(nonUrl)).toBe('not-a-url');
    });
  });
});
