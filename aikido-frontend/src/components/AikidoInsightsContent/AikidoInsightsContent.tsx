import {
  Content,
  ContentHeader,
  InfoCard,
  SupportButton,
  Table,
  TableColumn,
  Progress,
  Link,
} from '@backstage/core-components';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid2 from '@mui/material/Grid';
import { styled } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import CloudIcon from '@mui/icons-material/Cloud';
import CodeIcon from '@mui/icons-material/Code';
import LockIcon from '@mui/icons-material/Lock';
import BugReportIcon from '@mui/icons-material/BugReport';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import React, { useState } from 'react';

import { useAikidoInsights } from '../../hooks';
import { AikidoCommonObjectInsights } from '@internal/backstage-plugin-aikido-common';

// Styled components
const StyledTabs = styled(Tabs)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const OverviewChip = styled(Chip)(({ theme }) => ({
  marginRight: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

const StyledLink = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  fontSize: 'small',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  marginLeft: theme.spacing(1),
}));

const TitleContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: theme.spacing(1),
}));

const SeverityChip = styled(Chip)({
  fontWeight: 'bold',
});

const IconContainer = styled('span')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  value: any;
}

type SeverityType = 'critical' | 'high' | 'medium' | 'low';

const getSeverityChipStyle = (theme: any, severity: SeverityType) => {
  const severityColors = {
    critical: {
      backgroundColor: theme.palette.error.light,
      color: theme.palette.error.contrastText,
    },
    high: {
      backgroundColor: theme.palette.warning.light,
      color: theme.palette.warning.contrastText,
    },
    medium: {
      backgroundColor: theme.palette.info.light,
      color: theme.palette.info.contrastText,
    },
    low: {
      backgroundColor: theme.palette.success.light,
      color: theme.palette.success.contrastText,
    },
  };
  return severityColors[severity];
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Grid2
      role="tabpanel"
      hidden={value !== index}
      id={`insights-tabpanel-${index}`}
      aria-labelledby={`insights-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </Grid2>
  );
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'cloud':
    case 'cloud configuration':
      return <CloudIcon />;
    case 'leaked_secret':
    case 'leaked secrets':
      return <LockIcon />;
    case 'sast':
    case 'code security':
      return <CodeIcon />;
    case 'vulnerability':
    case 'vulnerabilities':
      return <BugReportIcon />;
    default:
      return <SecurityIcon />;
  }
}

function getSeverityElement(severity: string, count: number) {
  if (count === 0) {
    return null;
  }

  let icon;
  let severityKey: SeverityType | 'default' = 'default';

  switch (severity) {
    case 'critical':
      icon = <ErrorIcon fontSize="small" />;
      severityKey = 'critical';
      break;
    case 'high':
      icon = <WarningIcon fontSize="small" />;
      severityKey = 'high';
      break;
    case 'medium':
      icon = <InfoIcon fontSize="small" />;
      severityKey = 'medium';
      break;
    case 'low':
      icon = <CheckCircleIcon fontSize="small" />;
      severityKey = 'low';
      break;
    default:
      icon = <InfoIcon fontSize="small" />;
  }

  return (
    <SeverityChip
      icon={<IconContainer>{icon}</IconContainer>}
      label={`${count} ${severity}`}
      size="small"
      sx={theme =>
        severityKey !== 'default'
          ? getSeverityChipStyle(theme as any, severityKey as SeverityType)
          : {}
      }
    />
  );
}

const severityIcons = {
  critical: <ErrorIcon />,
  high: <WarningIcon />,
  medium: <InfoIcon />,
  low: <CheckCircleIcon />,
};

const getAikidoLink = (repo: AikidoCommonObjectInsights) => {
  if (repo.objectType === 'repo' && repo.repoId && repo.accountId) {
    return `https://app.aikido.dev/repositories/${repo.repoId}?groupId=${repo.accountId}`;
  } else if (repo.objectType === 'account' && repo.accountId) {
    return `https://app.aikido.dev/queue?groupId=${repo.accountId}`;
  }
  return undefined;
};

const getDisplayName = (repo: AikidoCommonObjectInsights) => {
  if (repo.objectType === 'account' && repo.accountId) {
    return `Account (#${repo.accountId})`;
  }
  // prefer repoUrl if available, otherwise use repoId
  if (repo.objectType === 'repo' && repo.repoUrl) {
    return (
      repo.repoUrl.split('/').pop()?.replace('.git', '') || 'Unknown Repository'
    );
  }
  if (repo.objectType === 'repo' && repo.repoId) {
    return `Repo (#${repo.repoId})`;
  }
  if (repo.objectType !== 'account' && repo.objectType !== 'repo') {
    return `Unknown Type (${repo.objectType})`;
  }
  return 'Unknown Entry'; // this should never happen, but just in case
};

// Table component for repository insights
const RepoInsightsTable = ({ repo }: { repo: AikidoCommonObjectInsights }) => {
  const columns: TableColumn[] = [
    {
      title: 'Category',
      field: 'category',
      render: (row: any) => (
        <Grid2 container alignItems="center" spacing={1}>
          <Grid2>{getCategoryIcon(row.category)}</Grid2>
          <Grid2>
            <Typography variant="body2">{row.category}</Typography>
          </Grid2>
        </Grid2>
      ),
    },
    {
      title: 'Critical',
      field: 'critical',
      render: (row: any) => getSeverityElement('critical', row.critical),
    },
    {
      title: 'High',
      field: 'high',
      render: (row: any) => getSeverityElement('high', row.high),
    },
    {
      title: 'Medium',
      field: 'medium',
      render: (row: any) => getSeverityElement('medium', row.medium),
    },
    {
      title: 'Low',
      field: 'low',
      render: (row: any) => getSeverityElement('low', row.low),
    },
  ];

  const data = Object.entries(repo.insights).map(([category, counts]) => ({
    category,
    critical: counts.critical,
    high: counts.high,
    medium: counts.medium,
    low: counts.low,
  }));

  const repoDisplayName = getDisplayName(repo);
  const aikidoLink = getAikidoLink(repo);

  return (
    <Table
      options={{
        search: false,
        paging: false,
        padding: 'dense',
      }}
      title={
        <TitleContainer>
          <span style={{ flexShrink: 0 }}>{repoDisplayName}</span>
          {aikidoLink && (
            <StyledLink
              href={aikidoLink}
              to={aikidoLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              <OpenInNewIcon fontSize="small" /> View Issues
            </StyledLink>
          )}
        </TitleContainer>
      }
      columns={columns}
      data={data}
    />
  );
};

/**
 * Component that displays detailed security insights from Aikido
 * including a breakdown by repository and category.
 */
export const AikidoInsightsContent = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const { loading, error, insightsData, repos } = useAikidoInsights();

  const handleTabChange = (_: React.ChangeEvent<{}>, newValue: number) => {
    setSelectedTab(newValue);
  };

  // Early return for no data case
  if (!loading && !error && (!insightsData || repos.length === 0)) {
    return null;
  }

  // Generate overview chips for severity levels
  const renderOverviewChips = () => {
    if (!insightsData || !insightsData.aggregated) return null;

    return Object.entries(insightsData.aggregated)
      .filter(
        ([key, count]) =>
          ['critical', 'high', 'medium', 'low'].includes(key) && count > 0,
      )
      .map(([severity, count]) => (
        <Grid2 key={severity}>
          <OverviewChip
            icon={severityIcons[severity as SeverityType]}
            label={`${count} ${severity.charAt(0).toUpperCase() + severity.slice(1)}`}
            sx={theme =>
              getSeverityChipStyle(theme as any, severity as SeverityType)
            }
          />
        </Grid2>
      ));
  };

  // Content to display based on state
  const getContent = () => {
    if (loading) {
      return (
        <Grid2 container spacing={3}>
          <Grid2 size={{ xs: 12 }}>
            <InfoCard>
              <Progress />
              <Typography variant="body2">
                Loading security insights...
              </Typography>
            </InfoCard>
          </Grid2>
        </Grid2>
      );
    }

    // Error state
    if (error) {
      return (
        <Grid2 container spacing={3}>
          <Grid2 size={{ xs: 12 }}>
            <Alert severity="error">
              <Typography variant="body2">
                Failed to load security insights:
              </Typography>
              <Typography variant="body2" style={{ wordBreak: 'break-word' }}>
                {error.name}: {error.message}
              </Typography>
              {error.stack && (
                <details>
                  <summary>Details</summary>
                  <pre style={{ fontSize: '0.8rem', overflowX: 'auto' }}>
                    {error.stack}
                  </pre>
                </details>
              )}
            </Alert>
          </Grid2>
        </Grid2>
      );
    }

    // Success state
    return (
      <Grid2 container direction="column" spacing={3}>
        <Grid2 size={{ xs: 12 }}>
          <InfoCard>
            <Typography variant="h6">Overview</Typography>
            <Grid2 container spacing={1} sx={{ mt: 1 }}>
              {renderOverviewChips()}
            </Grid2>
            <Typography variant="body2" style={{ marginTop: 16 }}>
              {insightsData?.aggregated?.total === 0
                ? 'No security issues found! 🎉'
                : `${insightsData?.aggregated?.total || 0} total issues found across ${insightsData?.byRepo?.length || 0} entries`}
            </Typography>
          </InfoCard>
        </Grid2>

        {insightsData?.byRepo && insightsData.byRepo.length > 0 && (
          <Grid2 size={{ xs: 12 }}>
            {insightsData?.byRepo && insightsData.byRepo.length > 1 && (
              <StyledTabs
                value={selectedTab}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                aria-label="repository insights tabs"
              >
                {insightsData?.byRepo.map((repo, index) => {
                  const tabDisplayName = getDisplayName(repo);

                  return (
                    <Tab
                      key={index}
                      label={tabDisplayName}
                      id={`insights-tab-${index}`}
                      aria-controls={`insights-tabpanel-${index}`}
                    />
                  );
                })}
              </StyledTabs>
            )}

            {insightsData?.byRepo.map((repo, index) => (
              <TabPanel key={index} value={selectedTab} index={index}>
                <RepoInsightsTable repo={repo} />
              </TabPanel>
            ))}
          </Grid2>
        )}
      </Grid2>
    );
  };

  // Common wrapper with consistent header
  return (
    <Content>
      <ContentHeader title="Aikido Security Insights">
        <SupportButton>
          Detailed security insights from Aikido for your repositories.
        </SupportButton>
      </ContentHeader>
      {getContent()}
    </Content>
  );
};
