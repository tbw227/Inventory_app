# Testing Guide — Jest.js Best Practices

This project uses **Jest** for industry-standard testing. All code changes should include tests.

## Running Tests

```bash
# Run all tests (one-time)
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test Organization

Tests are organized by type in `__tests__/`:

```
__tests__/
├─ setup.js            # Database setup for all tests
├─ models/             # Unit tests for MongoDB schemas
│  ├─ Company.test.js
│  ├─ User.test.js
│  ├─ Job.test.js
│  └─ Supply.test.js
├─ routes/             # Integration tests for API endpoints
│  └─ jobs.test.js
└─ utils/              # Utility function tests
   └─ generatePdf.test.js
```

## Testing Philosophy: Arrange-Act-Assert

Every test follows a clear 3-step pattern:

```javascript
describe('Feature', () => {
  it('should do something when condition', () => {
    // ARRANGE: Set up test data
    const data = { name: 'Test' };

    // ACT: Execute the thing being tested
    const result = await functionUnderTest(data);

    // ASSERT: Verify the outcome
    expect(result).toBeDefined();
  });
});
```

## Test Categories

### Unit Tests (Models)
Test individual data models in isolation.

**Example:** [Company.test.js](__tests__/models/Company.test.js)

```javascript
describe('Company Model', () => {
  it('should create a company with valid data', async () => {
    const company = await Company.create({ name: 'SafeCo' });
    expect(company.name).toBe('SafeCo');
  });
});
```

**What to test:**
- Model creation with valid data
- Validation (invalid data should fail)
- Default values
- CRUD operations (Create, Read, Update, Delete)
- Relationships (foreign keys)
- Multi-tenant isolation

### Integration Tests (Routes)
Test API endpoints with full request/response cycle.

**Example:** [jobs.test.js](__tests__/routes/jobs.test.js)

Uses **supertest** to simulate HTTP requests:

```javascript
describe('Jobs Routes', () => {
  it('should create a job', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .send({ ...jobData });
    
    expect(response.status).toBe(201);
    expect(response.body).toBeDefined();
  });
});
```

**What to test:**
- Successful request/response
- Error handling (400, 404, 500 status codes)
- Data validation
- Side effects (database updates)
- Business logic (inventory decrement, etc.)

### Utility Tests
Test helper functions in isolation.

**Example:** [generatePdf.test.js](__tests__/utils/generatePdf.test.js)

```javascript
describe('PDF Generation', () => {
  it('should generate a PDF file', async () => {
    const pdf = await generateServiceReportPdf(jobData);
    expect(fs.existsSync(pdf)).toBe(true);
  });
});
```

**What to test:**
- Output format/content
- Edge cases (empty data, missing fields)
- Error handling
- File/network operations

## Best Practices

### 1. Test Names Should Be Clear
❌ Bad:
```javascript
it('works', () => { ... });
it('test create', () => { ... });
```

✅ Good:
```javascript
it('should create a job with valid data', () => { ... });
it('should decrement inventory when supplies are used', () => { ... });
```

### 2. Use `beforeEach` for Setup
```javascript
describe('User Model', () => {
  let company;

  beforeEach(async () => {
    // This runs before each test
    company = await Company.create({ name: 'Test' });
  });

  it('should create user for company', async () => {
    // company is ready here
    const user = await User.create({ company_id: company._id, ... });
  });
});
```

### 3. Test Both Happy Path and Error Cases
```javascript
describe('Job Creation', () => {
  // Happy path
  it('should create a job successfully', async () => {
    const job = await Job.create({ ...validData });
    expect(job).toBeDefined();
  });

  // Error path
  it('should fail without company_id', async () => {
    try {
      await Job.create({ ...invalidData });
      fail('Should have thrown error');
    } catch (err) {
      expect(err).toBeDefined();
    }
  });
});
```

### 4. Test Multi-Tenant Isolation
```javascript
it('should isolate data by company_id', async () => {
  const company1 = await Company.create({ name: 'Co1' });
  const company2 = await Company.create({ name: 'Co2' });

  const data1 = await Data.find({ company_id: company1._id });
  const data2 = await Data.find({ company_id: company2._id });

  expect(data1.length).toBe(1);
  expect(data2.length).toBe(0);
});
```

### 5. Mock External Services
For email, payments, third-party APIs, use jest mocks:

```javascript
jest.mock('../utils/sendEmail');

it('should send email when job completes', async () => {
  const mockMail = require('../utils/sendEmail');
  mockMail.sendEmail.mockResolvedValue({ messageId: 'test' });

  await completeJob(jobId);

  expect(mockMail.sendEmail).toHaveBeenCalled();
});
```

## Test Database Setup

Tests use **mongodb-memory-server** — a fake in-memory MongoDB that:
- Runs entirely in memory (fast, no external dependencies)
- Automatically clears between test suites
- Exactly mimics real MongoDB behavior

**See:** [__tests__/setup.js](__tests__/setup.js)

## Writing New Tests

When adding a feature:

1. **Create test file** in appropriate `__tests__` directory
2. **Write test FIRST** (Test-Driven Development is ideal)
3. **Make test pass** (implement feature)
4. **Commit test + feature together**

Example: Adding "list supplies for company" endpoint

```javascript
// __tests__/routes/supplies.test.js
describe('Supplies Routes', () => {
  it('should list supplies for a company', async () => {
    const response = await request(app)
      .get(`/api/supplies/${company._id}`);
    
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
  });
});
```

Then implement the route.

## Coverage

View test coverage with:

```bash
npm run test:coverage
```

This generates a report showing which lines of code are tested. Aim for:
- **Models:** 100% coverage
- **Routes:** 80%+ coverage
- **Utils:** 90%+ coverage

## Troubleshooting

**Tests timeout?**
- Increase timeout: `jest.setTimeout(10000);` at top of test file
- Often means async operations aren't awaited

**Email errors in logs?**
- Expected — we use example.com for SMTP in tests
- The error is caught and logged, tests still pass

**Tests hang?**
- Use `--forceExit` flag (already in npm test script)
- Ensures Jest exits even if background processes remain

## Continuous Integration

When you push to GitHub:
1. Tests should run automatically (GitHub Actions)
2. All tests must pass before merging PRs
3. Coverage should be tracked over time

Future: Add workflow to `.github/workflows/test.yml`

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest (API Testing)](https://github.com/visionmedia/supertest)
- [Best Practices](https://jestjs.io/docs/getting-started)
