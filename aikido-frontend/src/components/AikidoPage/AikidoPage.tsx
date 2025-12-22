import Typography from '@mui/material/Typography';
import {
  InfoCard,
  Header,
  Page,
  Content,
  ContentHeader,
  HeaderLabel,
  SupportButton,
} from '@backstage/core-components';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import { AikidoInsightsCard } from '../AikidoInsightsCard';
import { AikidoInsightsContent } from '../AikidoInsightsContent';

// Mock entity for standalone page demonstration
const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'aikido-demo',
    annotations: {
      'github.com/project-slug': 'example/repo1',
      'gitlab.com/project-slug': 'example/repo2',
    },
  },
  spec: {
    type: 'service',
    lifecycle: 'production',
    owner: 'team-a',
  },
};

/**
 * Mostly used for testing. Main standalone page for the Aikido plugin,
 */
export const AikidoPage = () => (
  <Page themeId="tool">
    <Header
      title="Aikido Security Insights"
      subtitle="Security insights from Aikido"
    >
      <HeaderLabel label="Owner" value="Security Team" />
      <HeaderLabel label="Lifecycle" value="Production" />
    </Header>
    <Content>
      <ContentHeader title="Plugin Overview">
        <SupportButton>
          This plugin integrates with Aikido to provide security insights for
          your repositories.
        </SupportButton>
      </ContentHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <InfoCard title="About Aikido Security Insights">
            <Typography variant="body1">
              The Aikido frontend plugin provides security insights from Aikido
              for your repositories. It displays insights in two components:
            </Typography>
            <ul>
              <Typography component="li">
                An overview card showing aggregated metrics
              </Typography>
              <Typography component="li">
                A detailed tab view breaking down insights by repository and
                category
              </Typography>
            </ul>
            <Typography variant="body1">
              These components can be added to your entity pages and will
              automatically display insights for repositories linked to the
              entity via SCM annotations or Aikido-specific annotations.
            </Typography>
          </InfoCard>
        </div>

        <div>
          <Typography variant="h4">Card Component Demo</Typography>
          <Typography variant="body2" paragraph>
            This is how the card component looks on an entity page:
          </Typography>
          <EntityProvider entity={mockEntity}>
            <AikidoInsightsCard />
          </EntityProvider>
        </div>

        <div>
          <Typography variant="h4">Detailed View Demo</Typography>
          <Typography variant="body2" paragraph>
            This is how the detailed tab view looks on an entity page:
          </Typography>
          <EntityProvider entity={mockEntity}>
            <AikidoInsightsContent />
          </EntityProvider>
        </div>
      </div>
    </Content>
  </Page>
);
