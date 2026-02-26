# Authentication Implementation Guide (Phase 2)

## Overview

Current state: Passwords are hashed, input validated. Missing: JWT tokens and login endpoint.

This guide shows how to implement stateless JWT authentication for your SaaS.

## Architecture

```
User Login Flow:
1. POST /auth/login with email + password
   ↓
2. Validate email exists, password matches hash
   ↓
3. Generate JWT signed token with user ID + company ID
   ↓
4. Return token to client
   ↓
5. Client stores token (httpOnly cookie or localStorage)
   ↓
6. Client sends token in Authorization header on future requests
   ↓
7. Middleware verifies token signature & expiration
   ↓
8. If valid: req.user set, request proceeds
   If invalid: 401 Unauthorized
```

## Step 1: Create Auth Middleware

File: `middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-this';
const JWT_EXPIRY = '24h'; // 24 hour tokens

/**
 * Generate JWT token for a user
 * @param {Object} user - User document from MongoDB
 * @returns {string} - Signed JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      companyId: user.company_id.toString(),
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify JWT token and extract payload
 * Middleware: use as router.get('/protected', authenticateToken, handler)
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // Attach decoded token to request
    next();
  });
}

module.exports = {
  generateToken,
  authenticateToken,
};
```

**Installation:**
```bash
npm install jsonwebtoken
```

## Step 2: Create Login Endpoint

File: `routes/auth.js` (new file)

```javascript
const express = require('express');
const User = require('../models/User');
const { hashPassword, verifyPassword } = require('../utils/auth');
const { generateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

/**
 * POST /auth/login
 * Body: { email, password }
 * Response: { token, user: { id, email, company_id, role } }
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validatedData;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user);

    // Return without password_hash
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        company_id: user.company_id,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout
 * Simply tells client to discard token
 */
router.post('/logout', (req, res) => {
  // Stateless: just tell client to remove token
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /auth/me
 * Get current logged-in user (requires valid token)
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-password_hash');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

## Step 3: Update Server to Use Auth Routes

File: `server.js` — add these lines after existing routes:

```javascript
// Auth routes (login, register, logout)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
```

## Step 4: Protect Routes with Authentication

To require a valid token, add middleware:

File: `routes/jobs.js` — example:

```javascript
const { authenticateToken } = require('../middleware/auth');

// Protect job routes
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const jobs = await Job.find({ company_id: req.user.companyId });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticateToken, validate(schemas.createJob), async (req, res, next) => {
  // User must be authenticated
  // req.user contains: userId, companyId, email, role
  try {
    const job = new Job({
      ...req.validatedData,
      company_id: req.user.companyId, // Use auth user's company
    });
    await job.save();
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});
```

## Step 5: Add Environment Variable

File: `.env`

```
JWT_SECRET=your-super-secret-random-key-at-least-32-chars-long
```

Then update `middleware/auth.js` to use it:

```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

## Testing Authentication

### Unit Tests

File: `__tests__/middleware/auth.test.js`

```javascript
const { generateToken, authenticateToken } = require('../../middleware/auth');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  it('should generate a valid JWT token', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      company_id: '507f1f77bcf86cd799439012',
      role: 'technician',
    };

    const token = generateToken(mockUser);
    expect(token).toBeTruthy();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-change-this');
    expect(decoded.userId).toBe(mockUser._id.toString());
    expect(decoded.companyId).toBe(mockUser.company_id.toString());
  });

  it('should reject invalid tokens', (done) => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } };
    const res = { status: jest.fn().returnThis(), json: jest.fn() };

    authenticateToken(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(403);
    done();
  });

  it('should extract token from Authorization header', (done) => {
    const mockUser = { _id: 'abc123', companyId: 'def456', email: 'test@test.com', role: 'admin' };
    const token = generateToken(mockUser);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    let nextCalled = false;

    authenticateToken(req, res, () => {
      nextCalled = true;
      expect(req.user.userId).toBe('abc123');
      done();
    });

    expect(nextCalled).toBe(true);
  });
});
```

### Integration Test

File: `__tests__/routes/auth.test.js`

```javascript
const request = require('supertest');
const express = require('express');
const User = require('../../models/User');
const authRoutes = require('../../routes/auth');
const { hashPassword } = require('../../utils/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Clear database
    await User.deleteMany({});
  });

  it('POST /auth/login should return token for valid credentials', async () => {
    // Create test user
    const password = 'testPassword123';
    const passwordHash = await hashPassword(password);
    const user = new User({
      email: 'tech@company.com',
      password_hash: passwordHash,
      company_id: new ObjectId(),
      role: 'technician',
    });
    await user.save();

    // Login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tech@company.com', password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('tech@company.com');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('POST /auth/login should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tech@company.com', password: 'wrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('GET /auth/me should require valid token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
```

## Client Usage (React Example)

```javascript
// Login
async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const { token } = await res.json();
  localStorage.setItem('token', token);
}

// Get jobs (with auth)
async function getJobs() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/jobs', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await res.json();
}

// Logout
function logout() {
  localStorage.removeItem('token');
}
```

## Common Issues & Fixes

### "JWT_SECRET not defined"
- Add to `.env`: `JWT_SECRET=your-random-secret-key`

### Token expires but app doesn't know
- Frontend should catch 403 response and prompt re-login
- Or use refresh tokens (Phase 3)

### Can't decode token
- Ensure same `JWT_SECRET` on all servers
- Check for extra spaces in .env

---

## When Ready

Run this command to implement:
1. Create `middleware/auth.js`
2. Create `routes/auth.js`
3. Run `npm install jsonwebtoken`
4. Update `server.js` with auth routes
5. Update `.env` with `JWT_SECRET`
6. Run tests: `npm test`
7. Commit: `git add . && git commit -m "feat: add JWT authentication"`

Then protect individual routes by adding `authenticateToken` middleware.
