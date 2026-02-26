# Quick Reference Guide 🚀

Fast lookup for common tasks and commands.

---

## The 5-Minute Refresh

**What is this?** Multi-tenant SaaS backend for safety service companies  
**Status:** MVP backend working, Phase 1 security done, Phase 2 auth in progress  
**Tests:** 39 passing ✅  
**Next:** Implement JWT authentication  

---

## Key Commands

```bash
# Install & Setup
npm install
cp .env.example .env              # Edit with your MongoDB URI

# Running
npm start                          # Production
npm run dev                        # Development (nodemon)
npm test                          # Run 39 tests
npm test -- --watch              # Auto-rerun tests

# Git
git status
git add .
git commit -m "feat: description"  # Semantic commit
git push origin main

# API Testing
curl http://localhost:5000/api/health   # Quick health check
```

---

## File Locations

| What | Where | Purpose |
|------|-------|---------|
| Models | `models/*.js` | Database schemas |
| Routes | `routes/*.js` | API endpoints |
| Tests | `__tests__/**` | Jest test suite |
| Utils | `utils/*.js` | Helpers (PDF, email, auth) |
| Middleware | `middleware/*.js` | Validators, error handlers |
| Config | `.env`, `server.js` | Settings |

---

## API Endpoints (Quick Reference)

```
POST /api/companies              Create company
GET  /api/companies              List companies

POST /api/users                  Create user
GET  /api/users                  List users

POST /api/clients                Create client
GET  /api/clients                List clients

POST /api/jobs                   Create job
GET  /api/jobs                   List jobs
POST /api/jobs/:id/complete      Complete job → PDF + email

POST /api/auth/login            ❌ NOT YET (Phase 2)
```

---

## Quick Curl Examples

```bash
# Create company
curl -X POST http://localhost:5000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"Safety Corp","subscription_tier":"basic"}'

# Create user (password will be hashed)
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"tech@company.com","password":"SecurePass123","company_id":"xxx","role":"technician"}'

# Get all jobs for a company
curl http://localhost:5000/api/jobs?company_id=xxx

# Complete a job (sends PDF + email)
curl -X POST http://localhost:5000/api/jobs/jobid/complete \
  -H "Content-Type: application/json" \
  -d '{"supplies_used":[{"supply_id":"s1","quantity":2}]}'
```

---

## Important Concepts

### Multi-tenant
Every record has `company_id` field. Companies see only their own data.

### Password Hashing
Never use plain password. Always hash with bcryptjs (happens in routes/users.js)

### Validation
All POST requests validated with Joi. Unknown fields stripped for security.

### Error Handling
Centralized in middleware/errorHandler.js. No stack traces in production.

### Testing
Run `npm test` before committing. All 39 tests must pass.

---

## Common Patterns

### Creating an API endpoint

```javascript
// routes/example.js
const express = require('express');
const { validate } = require('../middleware/validation');
const Example = require('../models/Example');
const router = express.Router();

// Define validation schema
const createSchema = Joi.object({
  name: Joi.string().required(),
  company_id: Joi.string().required(),
});

// Create endpoint
router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const validated = req.validatedData; // From validate middleware
    const doc = new Example(validated);
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    next(err); // Pass to error handler
  }
});

module.exports = router;
```

### Writing a test

```javascript
// __tests__/example.test.js
const request = require('supertest');
const app = require('../server');
const Example = require('../models/Example');

describe('Example API', () => {
  beforeEach(async () => {
    await Example.deleteMany({});
  });

  it('should create an example', async () => {
    const res = await request(app)
      .post('/api/example')
      .send({ name: 'Test', company_id: 'company123' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test');
  });
});
```

---

## Security Checklist (MVP)

- [x] Password hashing (bcryptjs)
- [x] Input validation (Joi)
- [x] HTTP headers (Helmet)
- [x] Rate limiting (100/15min)
- [x] Error handling (no leaks)
- [x] Request logging (Morgan)
- [ ] JWT authentication ← NEXT
- [ ] Authorization/RBAC
- [ ] HTTPS enforcement

---

## What's Missing (Phase 2)

**JWT Authentication:**
- [ ] Create `middleware/auth.js` with token sign/verify
- [ ] Create `routes/auth.js` with login endpoint
- [ ] Add `npm install jsonwebtoken`
- [ ] Add JWT_SECRET to .env

See [AUTHENTICATION.md](AUTHENTICATION.md) for complete guide.

---

## Debugging Tips

**Tests failing?**
```bash
npm test -- --verbose
npm test -- __tests__/models/User.test.js  # Run one file
```

**API not responding?**
```bash
# Check if server running
curl http://localhost:5000/api/health

# Check logs
# See console output or check Morgan logs
```

**Database connection error?**
```bash
# Verify .env
# Test MongoDB URI directly in MongoDB Compass
# Check IP whitelist in MongoDB Atlas
```

**ValidationError in POST request?**
```javascript
// Check middleware/validation.js
// Ensure all required fields present
// Check field names in request body
```

---

## Documentation Map

```
📚 Start Here → README.md
     ↓
📊 Big Picture → SUMMARY.md (metrics, roadmap, tech stack)
     ↓
📋 Project Status → STATUS.md (what's done, next steps)
     ↓
🔐 Security → SECURITY.md (Phase 1-3 checklist)
     ↓
🔑 Authentication → AUTHENTICATION.md (JWT implementation)
     ↓
🧪 Testing → TESTING.md (how to write tests)
```

---

## Phase 2 Priority (Next Week)

**Goal:** Add login authentication

**Steps:**
1. `npm install jsonwebtoken`
2. Create `middleware/auth.js` (token generation/verification)
3. Create `routes/auth.js` (login endpoint)
4. Update `server.js` to include auth routes
5. Add `JWT_SECRET` to `.env`
6. Run tests (should still pass)
7. Commit: `git commit -m "feat: add JWT authentication"`

**Estimated time:** 2-3 hours

See [AUTHENTICATION.md](AUTHENTICATION.md) for complete code.

---

## Phase 3 Priority (Week After)

**Goal:** Build React frontend

**Components needed:**
- Login screen
- Job list view
- Job detail screen
- Job completion form
- Admin dashboard

**Estimated time:** 5-7 hours

---

## Remember

✅ **Always run tests before committing**
```bash
npm test
```

✅ **Use semantic commit messages**
```bash
git commit -m "feat: feature name"  # not "update" or "fix thing"
```

✅ **Never commit secrets**
```bash
# .env already in .gitignore
# Don't add passwords, API keys, etc to code
```

✅ **Check documentation first**
- [SUMMARY.md](SUMMARY.md) for big picture
- [STATUS.md](STATUS.md) for roadmap
- [SECURITY.md](SECURITY.md) for security
- [AUTHENTICATION.md](AUTHENTICATION.md) for JWT

---

## One-Liner Help

```bash
# Check everything is working
npm test && curl http://localhost:5000/api/health && git status

# See what's changed since last commit
git diff HEAD

# See commit history
git log --oneline

# See current branch
git branch
```

---

## When Stuck

1. **Check tests:** `npm test -- --verbose`
2. **Check logs:** Look at console output
3. **Check docs:** Read relevant .md file
4. **Check git:** `git status` and `git log`
5. **Check .env:** Is it configured correctly?
6. **Ask:** Search the codebase or documentation

---

**Questions?** See [SUMMARY.md](SUMMARY.md) or [STATUS.md](STATUS.md)
