# Splitwise-Like Expense Sharing App

Scaffold using:
- Backend: Node.js + Express + TypeScript
- Frontend: React + TypeScript (Vite)
- Database: PostgreSQL + Prisma

## Quick Start

1. Install dependencies:
   - `npm install`
2. Copy env template and set your cloud DB connection string:
   - `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`)
   - Set `DATABASE_URL` to your Prisma Postgres URL in `.env`
3. Generate Prisma client:
   - `npm run prisma:generate -w backend`
4. Sync schema to database:
   - `npm run prisma:migrate -w backend`
5. Seed baseline data:
   - `npm run prisma:seed -w backend`
6. Start apps:
   - `npm run dev`

## API Baseline

- Versioned routes are under `/api/v1`.
- Error responses follow this shape:

```json
{
  "success": false,
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable message",
    "details": null,
    "timestamp": "2026-04-18T00:00:00.000Z",
    "path": "/api/v1/...",
    "requestId": "optional-request-id"
  }
}
```
