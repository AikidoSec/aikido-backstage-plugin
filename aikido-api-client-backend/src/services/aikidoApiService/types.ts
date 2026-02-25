import {
  AikidoInsights,
  AikidoCommonObjectInsights,
} from '@internal/backstage-plugin-aikido-common';

export type { AikidoInsights };

// These are the types used by the Aikido Partner API responses
export interface AikidoToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AikidoAccount {
  id: number;
  name: string;
  account_external_ref: string;
  created_at: number;
  summary: {
    connected_repos: number;
    connected_clouds: number;
    connected_containers: number;
    connected_domains: number;
  };
}

export interface AikidoRepo {
  id: number;
  name: string;
  is_active: boolean;
  configuration_issues: Map<string, string>[];
  repo_url: string;
}

export interface AikidoIssue {
  id: number;
  group_id: number;
  attack_surface: string;
  status: 'open' | 'ignored' | 'snoozed' | 'closed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  severity_score: number;
  type:
    | 'open_source'
    | 'leaked_secret'
    | 'cloud'
    | 'sast'
    | 'iac'
    | 'surface_monitoring'
    | 'malware'
    | 'eol'
    | 'mobile';
  rule?: string;
  rule_id?: string;
  affected_package?: string;
  cve_id?: string;
  affected_file: string;
  first_detected_at: number;
  code_repo_id?: number;
  code_repo_name?: string;
  container_repo_id?: number;
  container_repo_name?: string;
  cloud_id?: number;
  cloud_name?: string;
  ignored_at?: number;
  closed_at?: number;
  ignored_by: string;
  start_line?: number;
  end_line?: number;
  snooze_until?: number;
  cwe_classes: string[];
  installed_version?: string;
  patched_versions: string[];
  license_type?: string;
  programming_language?: string;
  sla_days?: number;
  sla_remediate_by?: number;
}

export interface AikidoApiService {
  getIssueInsightsForRepoUrl(request: {
    repos: string[];
  }): Promise<{ [repo: string]: AikidoCommonObjectInsights }>;
  getIssueInsightsForAccountIds(request: {
    accountIds: number[];
  }): Promise<{ [accountId: string]: AikidoCommonObjectInsights }>;
  getIssueInsightsForRepoIds(request: {
    repoIds: number[];
  }): Promise<{ [repoId: string]: AikidoCommonObjectInsights }>;
}
