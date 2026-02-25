# Aikido Frontend Plugin for Backstage

This plugin integrates comprehensive security insights from Aikido directly into your Backstage instance. It provides a unified view of security issues including cloud misconfigurations, leaked secrets, SAST findings, and vulnerabilities across all your project repositories.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Backstage, Spotify AB, or Aikido Security BV.

## Features

- **Overview Card**: Aggregated security metrics by severity (critical, high, medium, low)
- **Detailed Tab**: Full breakdown of security issues per repository and per category
- **Conditional Rendering**: Components only appear when relevant SCM or Aikido-specific annotations are present
- **Intuitive UI**: Color-coded severity indicators

## Installation

1. Install the frontend plugin:

```bash
yarn add --cwd packages/app @internal/plugin-aikido-frontend
```

2. Install the backend plugin (required):

```bash
yarn add --cwd packages/backend @internal/plugin-aikido-api-client-backend
```

## Configuration

### Adding components to your Entity Page

In `packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import {
  EntityAikidoInsightsCard,
  EntityAikidoInsightsContent,
  hasAikidoOrScmAnnotations,
} from '@internal/plugin-aikido-frontend';

const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    {/* ...other cards */}
    <Grid item md={4} xs={12}>
      <EntityAikidoInsightsCard />
    </Grid>
  </Grid>
);

const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>
    <EntityLayout.Route
      if={hasAikidoOrScmAnnotations}
      path="/aikido"
      title="Security"
    >
      <EntityAikidoInsightsContent />
    </EntityLayout.Route>
  </EntityLayout>
);
```

## Entity Annotations

The plugin activates when one of the following annotations is present on an entity:

**SCM annotations** (added automatically by Backstage):
- `github.com/project-slug`
- `gitlab.com/project-slug`

**Aikido-specific annotations** (added manually):
- `aikido.dev/repo-ids` — comma-separated Aikido repository IDs
- `aikido.dev/workspace-ids` — comma-separated Aikido workspace IDs

Example:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    aikido.dev/repo-ids: repo1, repo2, repo3
```
