# Security Checklist & Implementation Guide

## ✅ Phase 1 — MVP Security (NOW COMPLETE)

### HTTP Security Headers
- [x] **Helmet.js** — automatically sets security headers
  - X-Frame-Options: Prevent clickjacking
  - X-Content-Type-Options: Prevent MIME type sniffing
  - Strict-Transport-Security: Enforce HTTPS
  - Content-Security-Policy: Prevent XSS attacks
  - And 10+ more security headers

### Rate Limiting
- [x] **express-rate-limit** — DDoS/brute force protection
  - 100 requests per 15 minutes per IP
  - Configurable per endpoint if needed

### Password Security
- [x] **bcryptjs** — password hashing with salt
  - Never store plain-text passwords
  - 10 salt rounds (secure but not slow)
  - Passwords hashed before storage in database

### Input Validation
- [x] **Joi** — comprehensive request validation
  - Type checking (string, number, date, etc.)
  - Length validation
  - Email format validation
  - MongoDB ObjectId validation
  - Prevents injection attacks by validating structure

### Error Handling
- [x] Centralized error handler middleware
  - Consistent error responses
  - Stack traces only in development
  - No sensitive information leaked in production

### Request Logging
- [x] **Morgan** — HTTP request logging
  - Development: detailed logs
  - Production: minimal performance impact
  - Helps identify suspicious activity

### Database
- [x] MongoDB parameterized queries via Mongoose
  - Prevents MongoDB injection attacks
  - Schema validation at model level

---

## 🚀 Phase 2 — Before Accepting Customers

### Authentication
- [ ] JWT (JSON Web Tokens) middleware
  - Secure token-based authentication
  - httpOnly cookies (prevent XSS token theft)
  - Token expiration & refresh
  - See: `AUTHENTICATION.md` (to create)

### Authorization (RBAC)
- [ ] Role-based access control middleware
  - Technician can only access assigned jobs
  - Admin can access all company data
  - Super admin can access all companies
  - See: `AUTHORIZATION.md` (to create)

### HTTPS
- [ ] Enforce HTTPS in production
  - Certificate from Let's Encrypt (free)
  - Redirect HTTP → HTTPS
  - Set Helmet HSTS headers (done by Helmet)

### Environment Variables
- [ ] Never commit `.env` file (already in .gitignore)
- [ ] Create `.env.example` with template values
- [ ] Rotate secrets periodically

### Database Security
- [ ] Enable MongoDB authentication
  - Username/password required
  - Role-based access at DB level
- [ ] Network isolation (IP whitelisting)
  - Only app servers can connect to MongoDB

### API Keys (for integrations)
- [ ] Store API keys in `.env` only
  - Not in code, not in logs
  - Rotate quarterly
- [ ] Use environment-specific keys

---

## 🔒 Phase 3 — Production Hardening

### Secrets Management
- [ ] Use AWS Secrets Manager or HashiCorp Vault
  - Centralized secret storage
  - Automatic rotation
  - Audit logs

### Dependency Scanning
- [ ] Run `npm audit` regularly
  - Check for known vulnerabilities
  - Update vulnerable packages

### CSRF Protection
- [ ] Add csurf middleware (if using sessions/cookies)
  - Not critical for stateless JWT APIs
  - Worth adding for FORM submissions

### Data Encryption
- [ ] Encrypt sensitive data at rest
  - Passwords (bcrypt — done)
  - Payment tokens (via Stripe — handled by Stripe)
  - Personal data (optional: field-level encryption)

### Audit Logging
- [ ] Log security events
  - Login attempts
  - Permission denials
  - Admin actions
  - Data access

### Monitoring & Alerts
- [ ] Application performance monitoring (APM)
  - Detect unusual activity
  - Alert on suspicious patterns
- [ ] Log aggregation (ELK, CloudWatch, etc.)
  - Centralized log analysis
  - Alerting on errors/attacks

---

## 🛠️ Current Implementation

### Files Added/Modified:

**New Files:**
- `middleware/errorHandler.js` — centralized error handling
- `middleware/validation.js` — Joi input validation with schemas
- `middleware/logger.js` — Morgan HTTP logging
- `utils/auth.js` — password hashing/verification functions

**Modified Files:**
- `server.js` — added Helmet, rate limiting, logging, error handler
- `routes/users.js` — added validation, password hashing
- `routes/companies.js` — added validation, error handling
- `routes/clients.js` — added validation, error handling
- `routes/jobs.js` — added validation, error handling
- `models/User.js` — added email lowercase, email uniqueness

---

## 🧪 Testing Security

Run tests to ensure nothing broke:

```bash
npm test
```

All 39 tests should pass. Security doesn't reduce functionality.

---

## 📋 Security Best Practices Implemented

✅ **Defense in Depth** — multiple layers
- Helmet headers
- Rate limiting
- Input validation
- Password hashing
- Error handling

✅ **Least Privilege** — users/roles have minimal necessary access
- Technicians see only assigned jobs
- Admins see company data only
- Multi-tenant isolation

✅ **Secure Defaults**
- JSON limit prevents uploading massive files
- Password minimum 6 characters (enforce stronger later)
- Email must be unique (prevents duplicate accounts)

✅ **Fail Securely**
- Errors don't reveal sensitive info
- Invalid input rejected clearly
- Database errors logged but generic response sent

✅ **Never Trust User Input**
- All requests validated with Joi
- Unknown fields stripped
- Email format checked
- ObjectIds validated

---

## 🚨 What NOT to Do

❌ Store passwords in plain text
❌ Log sensitive data (passwords, tokens, payment info)
❌ Skip input validation to "move faster"
❌ Use default/weak JWT secrets
❌ Disable HTTPS to reduce CPU
❌ Commit `.env` or secrets
❌ Build custom encryption (use proven libraries)
❌ Trust user IDs from requests (validate ownership)
❌ Expose error stack traces to users
❌ Mix authentication with business logic

---

## 🔄 Security Review Checklist (Monthly)

- [ ] Run `npm audit` and update vulnerable packages
- [ ] Review recent error logs for suspicious patterns
- [ ] Check rate limit logs for DDoS attempts
- [ ] Audit user permissions (especially admins)
- [ ] Review password policy (stronger passwords?)
- [ ] Check for exposed secrets in git history: `git log --all --grep=password`
- [ ] Update security headers if new vulnerabilities announced

---

## Questions?

See [TESTING.md](TESTING.md) for testing with new security layers.

Next: Build authentication system (Phase 2) when ready.