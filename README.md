# Inventory App 📦

A multi-tenant SaaS platform for safety & first aid service companies to manage jobs, track supplies, and generate automatic service reports.

**Status:** MVP Backend Complete ✅ | Security Phase 1 Done ✅ | Phase 2 (Auth) In Progress ⏳

---

## Quick Start

```bash
# Setup
git clone <repo>
cd Inventory_app
npm install

# Configure
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Test
npm test                # Run 39 passing tests

# Run
npm run dev             # Start on http://localhost:5000
```

---

## Features

✅ **Multi-tenant Architecture** — Fully isolated data per company  
✅ **Job Management** — Create, track, and complete jobs  
✅ **Inventory Tracking** — Auto-decrement supplies on job completion  
✅ **PDF Reports** — Automatically generate service reports  
✅ **Email Notifications** — Send reports to clients  
✅ **Security** — Password hashing, validation, rate limiting, HTTP headers  
✅ **Testing** — 39 passing Jest tests with full coverage  

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB Atlas |
| **Testing** | Jest + supertest (39 tests) |
| **Security** | Helmet, bcryptjs, Joi, rate-limit, Morgan |

---

## API Endpoints

### Health & Status
```
GET /api/health              # Health check
```

### Companies
```
POST   /api/companies        # Create company
GET    /api/companies        # List companies
```

### Users
```
POST   /api/users            # Create user (password hashed)
GET    /api/users            # List users by company_id param
```

### Clients
```
POST   /api/clients          # Create client
GET    /api/clients          # List clients by company_id param
```

### Jobs
```
POST   /api/jobs             # Create job
GET    /api/jobs             # List jobs by company_id param
POST   /api/jobs/:id/complete # Complete job (PDF + email)
```

### Authentication (Phase 2)
```
POST   /api/auth/login       # Login (TO IMPLEMENT)
POST   /api/auth/logout      # Logout (TO IMPLEMENT)
GET    /api/auth/me          # Get current user (TO IMPLEMENT)
```

---

## Example Workflow

```bash
# 1. Create a company
COMPANY=$(curl -s -X POST http://localhost:5000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"Safety Solutions","subscription_tier":"basic"}' | jq -r '._id')

# 2. Create a user
USER=$(curl -s -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"tech@safety.com\",\"password\":\"SecurePass123\",\"company_id\":\"$COMPANY\",\"role\":\"technician\"}" | jq -r '._id')

# 3. Create a client
CLIENT=$(curl -s -X POST http://localhost:5000/api/clients \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"ABC Corp\",\"phone\":\"555-0123\",\"company_id\":\"$COMPANY\"}" | jq -r '._id')

# 4. Create a job
JOB=$(curl -s -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -d "{\"client_id\":\"$CLIENT\",\"description\":\"Safety inspection\",\"company_id\":\"$COMPANY\"}" | jq -r '._id')

# 5. Complete the job (generates PDF + sends email)
curl -X POST http://localhost:5000/api/jobs/$JOB/complete \
  -H "Content-Type: application/json" \
  -d '{"supplies_used":[{"supply_id":"001","quantity":2}]}'
```

---

## Project Structure

```
Inventory_app/
├── models/                    # MongoDB schemas
│   ├── Company.js
│   ├── User.js
│   ├── Client.js
│   ├── Job.js
│   └── Supply.js
├── routes/                    # API endpoints
│   ├── companies.js
│   ├── users.js
│   ├── clients.js
│   ├── jobs.js
│   └── auth.js               # (TO CREATE - Phase 2)
├── middleware/                # Request processing
│   ├── errorHandler.js        # Centralized error handling
│   ├── validation.js          # Input validation (Joi)
│   ├── logger.js              # Request logging (Morgan)
│   ├── auth.js                # (TO CREATE - JWT)
│   └── rbac.js                # (TO CREATE - role-based)
├── utils/                     # Helper functions
│   ├── auth.js                # Password hashing/verification
│   ├── generatePdf.js         # PDF report generation
│   └── sendEmail.js           # Email sending (Nodemailer)
├── __tests__/                 # Jest test suite (39 passing)
├── server.js                  # Express app setup
├── package.json
├── .env.example
├── README.md                  # This file
├── SUMMARY.md                 # Complete project overview
├── STATUS.md                  # Current state & roadmap
├── SECURITY.md                # Security checklist
├── AUTHENTICATION.md          # JWT implementation guide
└── TESTING.md                 # How to write tests
```

---

## Environment Variables

Create `.env` in the root:

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
MONGODB_TEST_URI=mongodb://localhost:27017/inventory_test

# Server
PORT=5000
NODE_ENV=development

# Security
JWT_SECRET=your-random-secret-key-at-least-32-chars-long

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## Testing

```bash
# Run all tests (39 passing)
npm test

# Watch mode (re-run on change)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Run specific test file
npm test -- __tests__/models/Job.test.js
```

**Coverage includes:**
- ✅ 5 MongoDB models
- ✅ 4 API route files
- ✅ PDF generation
- ✅ Email sending
- ✅ Error handling
- ✅ Input validation

---

## Security

### Phase 1 — MVP Security ✅ COMPLETE

- [x] **Helmet** — HTTP security headers
- [x] **Rate Limiting** — 100 requests/15 minutes per IP
- [x] **Password Hashing** — bcryptjs (10 salt rounds)
- [x] **Input Validation** — Joi schemas on all endpoints
- [x] **Error Handling** — Centralized, no info leaks in production
- [x] **Request Logging** — Morgan audit trail

### Phase 2 — Before Customers ⏳ IN PROGRESS

- [ ] **JWT Authentication** — Secure login/logout
  - See [AUTHENTICATION.md](AUTHENTICATION.md)
- [ ] **Authorization** — Role-based access control
  - Technicians see only assigned jobs
  - Admins see all company data

### Phase 3 — Production ❌ PLANNED

- [ ] Secrets management (AWS/Vault)
- [ ] Data encryption at rest
- [ ] Backup & disaster recovery
- [ ] HTTPS enforcement
- [ ] See [SECURITY.md](SECURITY.md)

---

## Development

### Creating a Feature

```bash
# 1. Create branch
git checkout -b feat/your-feature-name

# 2. Make changes
# (edit files)

# 3. Test
npm test

# 4. Commit (semantic)
git add .
git commit -m "feat: add your feature"

# 5. Push
git push origin feat/your-feature-name
```

### Semantic Commits

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` code reorganization
- `test:` test additions
- `chore:` dependencies, config

---

## Documentation

| Document | Purpose |
|----------|---------|
| [SUMMARY.md](SUMMARY.md) | Complete project overview with metrics |
| [STATUS.md](STATUS.md) | Current state, what's next, roadmap |
| [SECURITY.md](SECURITY.md) | Security checklist (MVP → production) |
| [AUTHENTICATION.md](AUTHENTICATION.md) | JWT implementation guide (Phase 2) |
| [TESTING.md](TESTING.md) | How to write Jest tests |

**Start here:** [SUMMARY.md](SUMMARY.md) for the full picture

---

## Roadmap

| Phase | Status | Timeline | Details |
|-------|--------|----------|---------|
| **1: MVP Backend** | ✅ Complete | Done | Models, routes, testing |
| **1: Security** | ✅ Complete | Done | Phase 1 hardening |
| **2: Authentication** | ⏳ In Progress | Next | JWT login/logout |
| **2: Authorization** | ⏳ In Progress | This week | RBAC, role checks |
| **3: Frontend** | 🚀 Planned | 2 weeks | React mobile UI |
| **3: Deployment** | 🚀 Planned | 3 weeks | Backend + frontend live |

---

## Common Issues

### Port 5000 is in use
```bash
# Change port in .env
PORT=3001
npm run dev
```

### MongoDB connection error
```bash
# Verify connection string in .env
# Check: IP whitelist, username, password
# Use: MongoDB Atlas console to debug
```

### Tests fail on first run
```bash
# Ensure MongoDB test URI is configured
# Check: .env MONGODB_TEST_URI
npm test -- --verbose
```

### Password not hashing
```bash
# Password is hashed in route, not model
# Check: routes/users.js has hashPassword() call
# Never store plain passwords
```

---

## Next Steps

1. **Read [SUMMARY.md](SUMMARY.md)** — 10 min read, complete overview
2. **Implement Phase 2** — Follow [AUTHENTICATION.md](AUTHENTICATION.md)
   - JWT tokens: 2-3 hours
   - Role-based access: 1-2 hours
3. **Build Frontend** — React + Vite (5-7 hours)
4. **Deploy** — Railway, Vercel (1-2 hours)

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feat/amazing-feature`)
3. Write/update tests
4. Ensure all tests pass (`npm test`)
5. Commit with semantic message
6. Push to branch
7. Open a pull request

---

## Questions?

- **How does auth work?** See [AUTHENTICATION.md](AUTHENTICATION.md)
- **Is this secure?** See [SECURITY.md](SECURITY.md)
- **What's the status?** See [STATUS.md](STATUS.md)
- **How to test?** See [TESTING.md](TESTING.md)
- **Big picture?** See [SUMMARY.md](SUMMARY.md)

---

## License

MIT — Use freely for commercial or personal projects

---

**Ready to build?** Start with [SUMMARY.md](SUMMARY.md) → then [AUTHENTICATION.md](AUTHENTICATION.md) for Phase 2
