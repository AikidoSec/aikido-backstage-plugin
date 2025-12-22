import { useEffect } from 'react';
import { InfoCard } from '@backstage/core-components';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid2 from '@mui/material/Grid';
import { styled } from '@mui/material/styles';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAikidoInsights } from '../../hooks';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'default';

const StyledInsightItem = styled(Box, {
  shouldForwardProp: prop => prop !== 'severity',
})<{ severity: Severity }>(({ theme, severity }) => {
  const severityStyles = {
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
    default: {},
  };

  return {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: theme.shape.borderRadius,
    ...severityStyles[severity],
    overflow: 'hidden',
    minHeight: '70px',
    height: '100%',
  };
});

const CountTypography = styled(Typography)({
  fontWeight: 'bold',
  fontSize: '1.5rem',
}) as typeof Typography;

const LabelTypography = styled(Typography)({
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: '0.75rem',
}) as typeof Typography;

const InsightItem = ({
  severity,
  count,
}: {
  severity: string;
  count: number;
}) => {
  let icon;
  let label;

  switch (severity) {
    case 'critical':
      icon = <ErrorIcon />;
      label = 'Critical';
      break;
    case 'high':
      icon = <WarningIcon />;
      label = 'High';
      break;
    case 'medium':
      icon = <InfoIcon />;
      label = 'Medium';
      break;
    case 'low':
      icon = <CheckCircleIcon />;
      label = 'Low';
      break;
    default:
      icon = <InfoIcon />;
      label = severity;
  }

  return (
    <Grid2 size={{ xs: 6, sm: 3 }}>
      <StyledInsightItem
        severity={(severity as Severity) || 'default'}
        data-testid={`insight-${severity}`}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <CountTypography variant="h6">{count}</CountTypography>
        </Box>
        <LabelTypography variant="body2">{label}</LabelTypography>
      </StyledInsightItem>
    </Grid2>
  );
};

// Small card component used on the summary page of an entity
export const AikidoInsightsCard = () => {
  const { loading, error, insightsData, repos, refresh } = useAikidoInsights();

  useEffect(() => {}, [insightsData]);

  if (!loading && !error && (!insightsData || repos.length === 0)) {
    return null;
  }

  const getCardContent = () => {
    // Loading state
    if (loading) {
      return {
        buttonText: 'Loading...',
        buttonDisabled: true,
        content: (
          <Typography variant="body2">Loading security insights...</Typography>
        ),
      };
    }

    // Error state
    if (error) {
      return {
        buttonText: 'Retry',
        buttonDisabled: false,
        content: (
          <Typography variant="body2" color="error">
            Error loading insights: {error.message}
          </Typography>
        ),
      };
    }

    // Invalid data
    if (!insightsData || !insightsData.aggregated || !insightsData.byRepo) {
      // eslint-disable-next-line no-console
      console.error(
        '[AikidoInsightsCard] Invalid data structure:',
        insightsData,
      );

      return {
        buttonText: 'Retry',
        buttonDisabled: false,
        content: (
          <Typography variant="body2" color="error">
            Invalid data structure received from the server.
          </Typography>
        ),
      };
    }

    // Success state
    return {
      buttonText: 'Refresh',
      buttonDisabled: false,
      content: (
        <>
          <Grid2 container spacing={2}>
            <InsightItem
              severity="critical"
              count={insightsData.aggregated.critical}
            />
            <InsightItem severity="high" count={insightsData.aggregated.high} />
            <InsightItem
              severity="medium"
              count={insightsData.aggregated.medium}
            />
            <InsightItem severity="low" count={insightsData.aggregated.low} />

            <Grid2 size={{ xs: 12 }}>
              <Typography variant="body2">
                {insightsData.aggregated.total === 0
                  ? 'No security issues found! 🎉'
                  : `${insightsData.aggregated.total} total issues found across ${insightsData.byRepo.length} entries`}
              </Typography>
            </Grid2>
          </Grid2>
        </>
      ),
    };
  };

  const { buttonText, buttonDisabled, content } = getCardContent();

  // InfoCard rendering
  return (
    <InfoCard
      title="Aikido Security Insights"
      action={
        <Button
          color="primary"
          size="small"
          onClick={refresh}
          disabled={buttonDisabled}
          startIcon={<RefreshIcon />}
        >
          {buttonText}
        </Button>
      }
    >
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12 }}>{content}</Grid2>
      </Grid2>
    </InfoCard>
  );
};
