# FireTrack SaaS — Safety & First Aid Service Management

A cloud-based platform for safety & first aid service companies to manage inspections, track supplies, and automatically generate professional service reports.

## Features

- **Mobile-First Technician App** — complete jobs on-site, upload photos, log supplies used
- **Multi-Tenant Architecture** — isolate data per safety service company  
- **Automatic Service Reports** — PDF generation with supplies, photos, completion details
- **Inventory Tracking** — automatic decrement when supplies are used
- **Email Integration** — service reports sent to clients automatically
- **Admin Dashboard** — manage employees, clients, jobs, and reports

## Tech Stack

- **Backend:** Node.js + Express.js + MongoDB
- **Database:** MongoDB Atlas (cloud)
- **PDF Generation:** PDFKit
- **Email:** Nodemailer
- **Architecture:** Multi-tenant, KISS principle

## Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB Atlas account (free tier ok)
- npm

### Setup

1. **Clone & Install**
   ```bash
   cd Inventory_app/backend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.sample .env
   # Edit .env with your MongoDB URI and email credentials
   ```

3. **Seed Database**
   ```bash
   npm run seed
   ```

4. **Start Server**
   ```bash
   npm start
   ```

Server runs on `http://localhost:5000`

## API Endpoints

### Companies
- `GET /api/companies` — list all companies
- `POST /api/companies` — create company

### Users
- `GET /api/users/:companyId` — list users for company
- `POST /api/users` — create user

### Clients
- `GET /api/clients/:companyId` — list clients for company
- `POST /api/clients` — create client

### Jobs
- `GET /api/jobs/company/:companyId` — list jobs for company
- `POST /api/jobs` — create job
- `POST /api/jobs/:id/complete` — complete job (generate report, email, decrement inventory)

## Core Workflow

1. **Admin** creates job and assigns to technician
2. **Technician** views assigned job on mobile
3. **Technician** logs supplies used, uploads photos, marks complete
4. **System** auto-generates PDF, sends to client, decrements inventory
5. **Admin** views completed job in dashboard

## Project Structure

```
backend/
├─ models/          # MongoDB schemas
├─ routes/          # API endpoints
├─ utils/           # PDF generation, email sending
├─ db.js            # MongoDB connection
├─ server.js        # Express app
├─ seed.js          # Demo data
└─ package.json
```

## Testing

**Create a Job**
```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"company_id":"...", "client_id":"...", "assigned_user_id":"...", "scheduled_date":"2026-02-26"}'
```

**Complete a Job**
```bash
curl -X POST http://localhost:5000/api/jobs/JOB_ID/complete \
  -H "Content-Type: application/json" \
  -d '{
    "suppliesUsed":[{"name":"Bandages","quantity":2}],
    "photos":["https://via.placeholder.com/150"],
    "clientEmail":"customer@example.com"
  }'
```

## Future Enhancements

- Authentication & JWT
- Admin dashboard UI (React)
- Technician mobile app (React Native)
- Stripe subscription billing
- AWS S3 for file storage
- Recurring job scheduling
- Client portal
- QuickBooks integration

## License

MIT