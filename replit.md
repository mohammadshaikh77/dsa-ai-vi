# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (`gpt-5.2` model)
- **Auth**: Clerk

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### AI-Powered DSA Visualizer (`frontend/`)
- React + Vite + Tailwind + Framer Motion frontend
- Served at `/` (previewPath)
- Clerk authentication for sign-in/sign-up
- Pages: Home (`/`), History (`/history`), Analysis View (`/analyze/:id`)
- Sign-in/Sign-up at `/sign-in` and `/sign-up`

### API Server (`backend/`)
- Express 5 backend at `/api`
- DSA analysis endpoints at `/api/dsa/*`
- Clerk proxy middleware for auth

## API Endpoints

- `POST /api/dsa/analyze` — AI analysis of a DSA problem (returns pattern, difficulty, approaches, code, steps)
- `GET /api/dsa/history` — Recent analyses list
- `GET /api/dsa/history/:id` — Single analysis by ID
- `DELETE /api/dsa/history/:id` — Delete an analysis
- `GET /api/dsa/patterns` — Pattern usage statistics

## Database Schema

- `analyses` table: id, problem, pattern, difficulty, brute_force, optimal, code (jsonb), steps (jsonb), created_at

## AI Integration

Uses Replit AI Integrations for OpenAI (no user API key required). Uses `gpt-5.2` model with JSON response format for structured analysis output.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
