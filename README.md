# Expense Tracker

A personal finance dashboard application to record transactions, monitor monthly budget limits, and view spending insights in one place.

[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Nuxt UI](https://img.shields.io/badge/UI-Nuxt%20UI-00DC82)](https://ui.nuxt.com)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Node](https://img.shields.io/badge/Node-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)

## Live Demo

- https://zulk-expense.vercel.app/

## Key Features

- Financial dashboard with balance summary, spending trends, and budget progress.
- Quick actions for `Add Balance`, `Add Expense`, and budget limit updates.
- Full transaction management: list, filter, search, detail view, edit, delete, and CSV export.
- Reports page with spending insights (monthly/quarterly/yearly) and end-of-month projection.
- In-app notifications for budget milestones and transaction activity.
- Demo seed data to run the app with realistic sample records.

## Tech Stack

- Framework: Nuxt 4 (Vue 3 + TypeScript)
- UI: Nuxt UI + Tailwind CSS
- Database: MongoDB
- Validation: Zod
- Charts/Visualization: Unovis
- Utilities: VueUse, date-fns

## Run Locally

### 1. Prerequisites

- Node.js `20.x`
- pnpm (recommended) or npm
- MongoDB instance (Atlas/local)

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Copy the example env file:

```bash
cp .env.example .env
```

Then provide at least these values in `.env`:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=ExpensesData
MONGODB_DEFAULT_USER_ID=demo-user
```

### 4. Prepare database indexes (recommended)

```bash
pnpm db:indexes
```

### 5. Seed demo data (optional)

```bash
pnpm db:seed-home
```

### 6. Start the development server

```bash
pnpm dev
```

The app will run at `http://localhost:3000`.

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run Nuxt/Vue type checking
- `pnpm db:indexes` - Create MongoDB collections and indexes
- `pnpm db:seed-home` - Seed demo home/transaction data

## Project Structure (Brief)

```txt
app/
  components/      # Reusable UI components
  pages/           # App pages (dashboard, transactions, reports, settings)
server/
  api/             # API endpoints (home, transactions, members, notifications, etc.)
  utils/           # Server utilities (MongoDB connector)
scripts/
  create-indexes.mjs
  seed-home-demo.mjs
```

## API Endpoints (Summary)

- `GET /api/home`
- `POST /api/home/balance`
- `POST /api/home/expenses`
- `PATCH /api/home/budget-limit`
- `GET /api/transactions`
- `GET /api/transactions/:id`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`

## Deployment

This project is deployed on Vercel. To deploy your own instance:

1. Push the repository to your Git provider.
2. Import the project into Vercel.
3. Add the same environment variables as in `.env`.
4. Use Node.js `20.x` for the build runtime.

## License

This project is licensed under the [MIT License](LICENSE).
