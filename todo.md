# Travel Budget App - TODO

## DB Schema & Backend
- [x] DB schema: trips, trip_members, expenses, preparation_costs, places, expense_splits
- [x] DB migration via webdev_execute_sql
- [x] DB helpers in server/db.ts
- [x] tRPC routers: trips, members, expenses, prepCosts, places, ai

## Frontend - Layout & Style
- [x] Global elegant dark theme with premium OKLCH color palette
- [x] Mobile-first bottom tab navigation (Dashboard, Expenses, Map, AI, Settings)
- [x] App.tsx routing setup
- [x] Responsive TripLayout wrapper component

## Pages
- [x] Home: Trip list page with create/join trip flow
- [x] Trip Detail / Dashboard: summary cards, category pie chart, member spend bars
- [x] Preparation Costs page: pre-trip expenses (flight, hotel, visa, etc.)
- [x] Daily Expenses page: day-by-day expense log with add/edit/delete
- [x] Dutch Pay Calculator: member balance summary and settlement instructions
- [x] Map page: visited places pins + route visualization + plan future places
- [x] AI Analysis page: AI-powered spending analysis in natural language
- [x] Settings page: trip settings, member management, invite code, delete trip

## Features
- [x] Trip creation with name, dates, members, currency, budget
- [x] Expense CRUD with category, payer, amount, date, location
- [x] Preparation cost CRUD by category
- [x] Dutch pay auto-calculation (greedy settlement algorithm)
- [x] Map: place search (Google Places Autocomplete), pin drop, route drawing
- [x] AI analysis: category patterns, saving tips, budget warnings (LLM)
- [x] Dashboard charts (recharts): category breakdown pie, daily trend bar
- [x] Invite code system for joining trips
- [x] deleteTrip cascades all related data

## Tests
- [x] Auth logout vitest (server/auth.logout.test.ts)
- [x] Dutch pay calculation vitest (server/travel.test.ts)
- [x] Category aggregation vitest (server/travel.test.ts)
- [x] Settlement algorithm vitest (server/travel.test.ts)
- All 10 tests passing ✓
