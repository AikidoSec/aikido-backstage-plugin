# Backstage Aikido API Client Backend Plugin

This Backstage plugin integrates with the Aikido Partner API to provide vulnerability insights for your repositories. It exposes an endpoint that allows you to retrieve vulnerability data for repositories, workspaces, or repository IDs.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Backstage, Spotify AB, or Aikido Security BV.

## Features

- Retrieve vulnerability insights for specific repositories
- Query by repository names, account IDs, or repository IDs
- Secure integration with Aikido Partner API

## Installation

### For Backstage App Builders

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

Add the following to your `app-config.yaml` to configure the Aikido API client:

```yaml
catalog:
  providers:
    aikido:
      clientId: ${AIKIDO_CLIENT_ID}
      authSecret: ${AIKIDO_AUTH_SECRET}
```

You can also set these values directly in the config file during development, but using environment variables is recommended for production deployments.

## API Endpoints

The plugin exposes the following endpoint:

### POST `/api/aikido-api-client/insights`

Retrieves vulnerability insights for specified repositories.

**Request Body:**

```json
{
  "repos": ["repo1", "repo2"], // Optional: List of repository names
  "account_ids": [123, 456], // Optional: List of account IDs
  "repo_ids": [789, 101112] // Optional: List of repository IDs
}
```

Note: At least one of `repos`, `account_ids`, or `repo_ids` must be provided.

## Development

### Setup

1. Clone the repository
2. Install dependencies with `yarn install`
3. Start the backend in standalone mode:

```bash
cd src/plugins/aikido-api-client-backend
yarn start
```

This provides a limited setup that's convenient for developing the plugin itself.

If you want to run the entire Backstage project, including the frontend, run `yarn dev` from the Backstage root directory.

### Testing with Credentials

For development with real API credentials:

1. Create a local config file:

```bash
# From the plugin directory
cp ./dev/rootConfig.json.example ./dev/rootConfig.json
```

2. Edit `rootConfig.json` with your actual Aikido API credentials:

```json
{
  "data": {
    "catalog": {
      "providers": {
        "aikido": {
          "clientId": "your-client-id",
          "authSecret": "your-auth-secret"
        }
      }
    }
  }
}
```
