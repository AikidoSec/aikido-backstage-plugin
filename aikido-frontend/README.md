# Aikido Frontend Plugin for Backstage

This plugin integrates comprehensive security insights from Aikido directly into your Backstage instance. It provides a unified view of security issues including cloud misconfigurations, leaked secrets, SAST findings, and vulnerabilities across all your project repositories, helping teams identify and address security concerns efficiently.

## Features

- **Overview Card**: A condensed view showing aggregated security metrics by severity (critical, high, medium, low)
- **Detailed Tab**: An expandable view showing the full breakdown of security issues per repository and per category
- **Conditional Rendering**: Components only appear when relevant SCM annotations or Aikido-specific annotations are present
- **Intuitive UI**: Clear visual indicators with colors and icons to show severity and priority of issues

## Project Structure

The plugin consists of the following key components:

- **`AikidoInsightsCard`**: A card component showing aggregated security metrics that can be added to entity overview pages
- **`AikidoInsightsContent`**: A detailed view component for in-depth security information that can be added as a separate tab
- **`AikidoPage`**: A standalone page that demonstrates both components (mostly used for development)
- **`AikidoApiClient`**: Client for interacting with the Aikido API backend
- **`hasAikidoOrScmAnnotations`**: Utility function to determine if an entity should display Aikido components

## Prerequisites

Before installing this plugin, ensure you have:

- A running Backstage instance (version 1.0.0 or later)
- Access to an Aikido instance with API credentials
- Node.js 16 or later
- Yarn 1.22.0 or later

## Installation

1. Install the plugin in your Backstage app:

```bash
# From your Backstage root directory
yarn add --cwd packages/app @internal/plugin-aikido-frontend
```

2. Make sure you also have the backend plugin installed:

```bash
# From your Backstage root directory
yarn add --cwd packages/backend @internal/plugin-aikido-api-client-backend
```

## Configuration

### Adding the components to your Entity Page

Add the Aikido components to your EntityPage in `packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import {
  EntityAikidoInsightsCard,
  EntityAikidoInsightsContent,
  hasAikidoOrScmAnnotations,
} from '@internal/plugin-aikido-frontend';

// Add the card to the overview tab
const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    {/* ...other cards */}
    <Grid item md={4} xs={12}>
      <EntityAikidoInsightsCard />
    </Grid>
    {/* ...other cards */}
  </Grid>
);

// Add the Aikido tab to the entity tabs
const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>
    {/* ...other tabs */}
    <EntityLayout.Route
      if={hasAikidoOrScmAnnotations}
      path="/aikido"
      title="Security"
    >
      <EntityAikidoInsightsContent />
    </EntityLayout.Route>
  </EntityLayout>
);

// Make sure to do the same for other entity pages (website, library, etc.)
```

### Entity Annotations

The Aikido plugin requires one of the following annotations to be present on an entity:

1. **SCM annotations** (automatically added by Backstage catalog processor):
   - `github.com/project-slug`: For GitHub repositories (e.g., `organization/repo-name`)
   - `gitlab.com/project-slug`: For GitLab repositories (e.g., `organization/repo-name`)

2. **Aikido-specific annotations** (manually added to your catalog entities):
   - `aikido.dev/repo-ids`: Comma-separated list of repository IDs registered in Aikido
   - `aikido.dev/workspace-ids`: Comma-separated list of workspace IDs in Aikido

Example catalog YAML with Aikido annotations:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    aikido.dev/repo-ids: repo1, repo2, repo3
    # Alternatively or additionally:
    aikido.dev/workspace-ids: workspace1, workspace2
spec:
  type: service
  # ...other specifications
```

## Backend Configuration

Ensure that the backend plugin is properly configured in your `app-config.yaml`:

```yaml
backend:
  plugins:
    aikido-api-client:
      baseUrl: 'https://your-aikido-instance.example.com/api'
      # Optional: authentication settings
      auth:
        token: ${AIKIDO_API_TOKEN}
```

## Development

To start the app with the Aikido plugin:

```bash
# From your Backstage root directory
yarn start
```

To run the plugin in isolation:

```bash
# From the plugin directory
cd src/plugins/aikido-frontend
yarn start
```

## Testing

To run the tests for the plugin:

```bash
# From the plugin directory
cd src/plugins/aikido-frontend
yarn test
```

## Error Handling

The plugin includes robust error handling with:

- Automatic retries for transient server errors
- Graceful degradation when data can't be loaded
- Informative error messages for troubleshooting