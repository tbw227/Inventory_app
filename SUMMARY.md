# Inventory App - Project Overview

## Product

**Product:** Multi-tenant SaaS platform for safety & first aid service companies
**Core value:** Job management, supply/inventory tracking, PDF service reports, payments, and analytics
**Architecture:** Node.js + Express API with React SPA, multi-tenant data isolation via `company_id`
**Database:** PostgreSQL (Supabase) with Prisma ORM
**Target market:** Field service teams of 10–100+ employees

---

## Technology Stack

### Backend
| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 18+ |
| Framework | Express | 5.x |
| ORM | Prisma Client | 6.19 |
| Database | PostgreSQL (Supabase) | — |
| Auth | JWT (jsonwebtoken) | 9.x |
| Validation | Joi | 18.x |
| File uploads | Multer | 2.x |
| Image processing | Sharp | 0.34 |
| PDF generation | PDFKit | 0.13 |
| Email | Nodemailer | 8.x |
| Payments | Stripe | 22.x |
| Monitoring | Sentry | 10.x |
| Logging | Winston + Morgan | — |
| Security | Helmet, express-rate-limit, bcryptjs | — |
| API docs | Swagger (swagger-jsdoc + swagger-ui-express) | — |
| Testing | Jest 30 + Supertest 7 | — |

### Frontend
| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18.2 |
| Bundler | Vite | 8.x |
| Styling | Tailwind CSS | 3.4 |
| State management | React Context + hooks | built-in |
| Routing | React Router DOM | 6.x |
| HTTP client | Axios | 1.15 |
| Charts | Recharts | 3.8 |
| Animations | Framer Motion | 12.x |
| QR/Barcode scanning | @zxing/browser | 0.1 |
| Barcode generation | JsBarcode | 3.12 |
| CSV parsing | PapaParse | 5.5 |
| PWA | vite-plugin-pwa | 1.3 |
| Payments UI | @stripe/react-stripe-js | 6.x |
| Supabase client | @supabase/supabase-js | 2.x |

---

## Database Schema (Prisma / PostgreSQL)

```
Company
├── Users (admin, technician) — JWT auth, bcrypt passwords, preferences
├── Clients — service contracts, required supplies, QuickBooks sync
│   └── Locations — per-client service sites, station inventory
├── Supplies — inventory items, pricing tiers, reorder thresholds, categories
├── Jobs — scheduled work, supply tracking, photos, PDF reports, billing
│   ├── JobLocations (many-to-many)
│   └── Payments — Stripe payment intents per job
├── SupplyImportJobs → SupplyImportRows (CSV bulk import pipeline)
└── QuickBooksConnection — OAuth tokens for QB integration
```

**Enums:** UserRole, JobStatus, PaymentStatus, SubscriptionTier, SubscriptionStatus, SupplyImportJobStatus/Type/RowStatus

All models enforce `company_id` foreign key for multi-tenant isolation.

---

## Backend Services (17)

| Service | Purpose |
|---|---|
| authService | Login, JWT generation/verification, password reset |
| userService | CRUD users, profile updates, photo upload |
| companyService | Company management, subscription tier |
| clientService | CRUD clients, service dates |
| jobService | CRUD jobs, completion workflow, supply decrement |
| supplyService | CRUD supplies, reorder alerts, stock management |
| supplyImportService | CSV bulk import pipeline for supplies |
| locationService | CRUD client locations, station inventory |
| paymentService | Stripe payment intents, payment recording |
| subscriptionService | Stripe subscription lifecycle |
| dashboardService | Analytics aggregation (revenue, job stats, inventory) |
| weatherService | OpenWeather / Open-Meteo forecasts per tenant |
| twcWeatherService | The Weather Company v3 integration |
| emailService | Transactional emails via Nodemailer |
| pdfService | Service report PDF generation (PDFKit) |
| quickbooksService | QuickBooks OAuth + API calls |
| quickbooksIntegrationService | QB sync orchestration |

## API Routes (14 route files)

| Route file | Key endpoints |
|---|---|
| auth | POST /login, POST /logout, GET /me, POST /forgot-password, POST /reset-password |
| users | GET /, POST /, GET /:id, PUT /:id, DELETE /:id |
| companies | GET /, POST /, PUT /:id |
| clients | GET /, POST /, GET /:id, PUT /:id, DELETE /:id |
| jobs | GET /, POST /, GET /:id, PUT /:id, POST /:id/complete, POST /:id/inventory-used |
| supplies | GET /, POST /, PUT /:id, DELETE /:id, POST /import |
| locations | GET /, POST /, PUT /:id, DELETE /:id |
| payments | GET /, POST /create-intent, POST /confirm |
| dashboard | GET /summary, GET /analytics |
| weather | GET /forecast |
| upload | POST /photo |
| uploads | Static file serving |
| integrations | QuickBooks OAuth flow |
| webhooks | Stripe webhook handler |

## Middleware (5)

| Middleware | Purpose |
|---|---|
| auth | JWT verification, `req.user` injection, role guards |
| validation | Joi schema validation on request bodies |
| errorHandler | Centralized error formatting, no info leaks |
| logger | Morgan HTTP request logging |
| responseCacheControl | Cache-Control headers for static assets |

---

## Frontend Pages (22)

| Page | Description |
|---|---|
| Login | Email/password authentication |
| ForgotPassword | Password reset request |
| ResetPassword | Token-based password reset |
| Dashboard.new | Main landing — hero card, KPIs, revenue chart, calendar, analytics |
| Jobs | Job list with status filters |
| JobDetail | Single job view, supply usage, photos, completion |
| JobHistory | Completed jobs archive |
| ScanJob | QR code scanner to open jobs |
| Clients | Client list management |
| ClientDetail | Client detail, locations, service dates |
| Supplies | Inventory management, CSV import, reorder alerts |
| Users | Team member list (admin) |
| UserDetail | User profile, assigned jobs |
| Profile | Current user profile editing |
| Settings | App preferences, weather theme, accent color, billing, QuickBooks |
| Locations | Client location management |
| Labels / PrintLabels / JobLabel | QR code & barcode label generation and printing |
| WeatherDemo | Weather widget showcase |

## Key Frontend Components

**Dashboard:** DashboardHero, DashboardKpis, DashboardCharts, HeroRevenueChart, RevenueChart, RevenueBreakdownCharts, InventoryAnalyticsCharts, InventoryOverviewCharts

**Weather system:** WeatherWidget, WeatherMini, WeatherFull, AnimatedWeather, WeatherConditionIcon — multi-source (OpenWeather, Open-Meteo, The Weather Company), themed, condition-aware animations

**Layout:** Layout (sidebar + header + bottom nav), BottomNav

**Shared UI:** Avatar, AuthedImg, QrScanner, FullScreenModal, HomeNavLink

**Custom hooks (11):** useDashboardData, useCalendarData, useJobs, useJob, useTenantWeather, useWeatherCompany, useExtraContent, useOrgWeatherSettings, usePreferenceSettings, useQuickBooksSettings, useBillingSettings

**State management:** React Context (AuthContext, ThemeContext) + useState/useEffect for local state

---

## Security

| Layer | Implementation | Status |
|---|---|---|
| Authentication | JWT tokens (jsonwebtoken), bcryptjs password hashing | Done |
| Authorization | Role-based access control (admin/technician) via auth middleware | Done |
| HTTP headers | Helmet.js (CSP, HSTS, X-Frame, etc.) | Done |
| Rate limiting | express-rate-limit | Done |
| Input validation | Joi schemas on all mutating endpoints | Done |
| Input sanitization | Path traversal protection, regex whitelisting on params | Done |
| XSS prevention | Safe mailto/tel links, safeRedirect utility | Done |
| Open redirect | safeRedirect guard on all navigate/Navigate calls | Done |
| Error handling | Centralized middleware, no stack traces in production | Done |
| Request logging | Morgan + Winston | Done |
| Payments | Stripe webhook signature verification | Done |
| File uploads | Multer with size limits, Sharp image processing | Done |
| CSRF/CRLF | Nodemailer 8.x (patched), Axios 1.15 (patched) | Done |

## Third-Party Integrations

| Integration | Purpose |
|---|---|
| **Stripe** | Payments (payment intents), subscriptions (tiered plans), webhook events |
| **Supabase** | PostgreSQL hosting, potential file storage |
| **OpenWeather / Open-Meteo** | Weather forecasts for job scheduling |
| **The Weather Company** | Premium weather data (optional) |
| **Nodemailer** | Transactional email (service reports, password resets) |
| **QuickBooks** | Accounting sync (OAuth2 integration) |
| **Sentry** | Error monitoring and performance tracking |
| **GNews / RSS** | News headlines for dashboard extras |

---

## Testing

```
Framework: Jest 30 + Supertest 7

Test files:
├── backend/__tests__/helpers.js (test data factory + credentials)
└── backend/__tests__/routes/
    └── auth.test.js (authentication flow tests)
```

Test credentials are centralized via `TEST_CREDENTIALS` with env var overrides.

---

## DevOps & Scripts

**Root** (`package.json`):
- `dev` — runs backend + frontend concurrently
- `dev:backend` / `dev:frontend` — individual dev servers
- `supabase:start` / `supabase:stop` / `supabase:status`

**Backend** (`backend/package.json`):
- `start` / `dev` — Node server
- `test` / `test:watch` / `test:coverage` — Jest
- `prisma:generate` / `prisma:migrate` / `prisma:deploy` — Prisma CLI
- `postinstall` — auto-runs `prisma generate`

**Frontend** (`frontend/package.json`):
- `dev` — Vite dev server
- `build` — production build
- `preview` — preview production build

---

## Business Model

**Target:** Safety & first aid field service companies
**Team sizes:** 10–100+ employees per tenant
**Subscription tiers:** Basic, Growth, Pro
**Payments:** Per-job payment collection via Stripe
**Integrations:** QuickBooks for accounting sync

---

## File Structure

```
Inventory_app/
├── backend/
│   ├── prisma/schema.prisma          (14 models)
│   ├── routes/                       (14 route files)
│   ├── services/                     (17 service files)
│   ├── middleware/                    (5 middleware files)
│   ├── controllers/                  (route handlers)
│   ├── utils/                        (AppError, helpers)
│   ├── config/                       (db.js)
│   ├── __tests__/                    (Jest test suite)
│   ├── app.js                        (Express app setup)
│   └── server.js                     (entry point)
├── frontend/
│   ├── src/
│   │   ├── pages/                    (22 page components)
│   │   ├── components/               (dashboard, layout, ui, tech, shared)
│   │   ├── features/weather/         (weather system — 11 files)
│   │   ├── hooks/                    (11 custom hooks)
│   │   ├── context/                  (AuthContext, ThemeContext)
│   │   ├── services/api.js           (Axios instance + interceptors)
│   │   ├── config/                   (routes, dashboard accents)
│   │   └── utils/                    (safeRedirect, mediaUrl, etc.)
│   ├── vite.config.js
│   └── package.json
├── docs/
│   └── CSS_MAP.md
├── SUMMARY.md                        (this file)
└── package.json                      (root monorepo scripts)
```
