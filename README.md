# Zafeer

Workspace monorepo containing API server, mockup sandbox, and shared libraries.

## Structure

```
artifacts/
  ├── api-server/         # Backend API (Express + Drizzle)
  ├── mockup-sandbox/     # Frontend mockup playground
  └── sawtracker/         # SawTracker app

lib/
  ├── api-client-react/   # React client for API
  ├── api-spec/           # API specification
  ├── api-zod/            # Zod schemas
  └── db/                 # Database layer

scripts/                  # Workspace scripts
```

## Requirements

- Node.js 18+
- pnpm (required — npm/yarn will refuse to install)

## Setup

```bash
pnpm install
pnpm run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run build` | Build all workspaces |
| `pnpm run typecheck` | Type-check the entire workspace |

## License

MIT
