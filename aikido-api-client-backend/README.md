# Backstage Aikido API Client Backend Plugin

This Backstage plugin integrates with the Aikido Partner API to provide vulnerability insights for your repositories. It exposes an endpoint that allows you to retrieve vulnerability data for repositories, workspaces, or repository IDs.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Backstage, Spotify AB, or Aikido Security BV.

## Installation

1. Install the plugin package in your Backstage backend:

```bash
# From your Backstage root directory
yarn --cwd packages/backend add @internal/backstage-plugin-aikido-api-client-backend
```

2. Add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(import('@internal/backstage-plugin-aikido-api-client-backend'));
```

## Configuration

Add the following to your `app-config.yaml`:

```yaml
catalog:
  providers:
    aikido:
      clientId: ${AIKIDO_CLIENT_ID}
      authSecret: ${AIKIDO_AUTH_SECRET}
```

## API Endpoint

### POST `/api/aikido-api-client/insights`

Retrieves vulnerability insights for specified repositories.

**Request Body:**

```json
{
  "repos": ["repo1", "repo2"],
  "account_ids": [123, 456],
  "repo_ids": [789, 101112]
}
```

At least one of `repos`, `account_ids`, or `repo_ids` must be provided.
