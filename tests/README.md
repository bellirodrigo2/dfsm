# Contract Tests - Setup Guide

This directory contains contract tests that validate the PI Web API integration against a real PI Web API server.

## 📋 Overview

### Test Types

- **Unit Tests** (`src/**/*.test.ts`): Fast, isolated tests with mocks - no PI Web API required
- **Contract Tests** (`tests/contract/`): Integration tests against real PI Web API - validates API contracts

## 🚀 Prerequisites

### 1. AF Test Database

You need a dedicated AF Database for testing:

- **Database Name**: `DSM_TEST_DB` (or your choice)
- **Root Element**: Create an element (e.g., `DSM_TEST_ROOT`) where test elements will be created
- **Permissions**: Your test user needs read/write permissions on this element

### 2. Test User Credentials

You need credentials for a user with access to the test database:

- Windows domain account (for NTLM authentication)
- Or service account with basic authentication

## ⚙️ Setup Instructions

### Step 1: Copy Environment Template

```bash
cp .env.test.example .env.test
```

### Step 2: Configure Test Environment

Edit `.env.test` and fill in your values:

#### Required Settings:

```bash
# PI Web API URL
TEST_PIWEBAPI_URL=https://piwebapi-dev.yourcompany.com/piwebapi

# Authentication
TEST_PIWEBAPI_AUTH_TYPE=ntlm
TEST_PIWEBAPI_DOMAIN=YOURCOMPANY
TEST_PIWEBAPI_USERNAME=your_username
TEST_PIWEBAPI_PASSWORD=your_password

# AF Database
TEST_AF_SERVER=AFSERVER-DEV
TEST_AF_DATABASE=DSM_TEST_DB
```

#### Configure Root Element (choose one):

**Option A - WebId (Recommended):**

```bash
TEST_AF_ROOT_WEBID=F1AbCDeFgHiJkLmNoPqRsTuVwXyZ
```

To find the WebId:
1. Open PI System Explorer
2. Navigate to your test root element
3. Right-click → Properties → copy WebId

**Option B - Path (Fallback):**

```bash
TEST_AF_ROOT_PATH=\DSM_TEST_ROOT
```

### Step 3: Install Dependencies

```bash
pnpm install
```

## 🧪 Running Tests

### Unit Tests (No PI Web API required)

```bash
# Run unit tests
pnpm test

# Run unit tests in watch mode
pnpm test:unit

# Run with coverage
pnpm test:coverage
```

### Contract Tests (Requires PI Web API)

```bash
# Run contract tests
pnpm test:contract

# Run specific contract test file
pnpm test:contract tests/contract/userinfo.test.ts
```

### Start Test Proxy Manually

For debugging or development:

```bash
# Start proxy in separate terminal
pnpm test:proxy

# Proxy will be available at http://localhost:3001
```

## 🏗️ How It Works

### Test Proxy Architecture

```
┌──────────────────┐
│  Contract Tests  │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   Test Proxy     │  ← Resolves CORS
│  localhost:3001  │  ← Injects authentication
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   PI Web API     │  (Real server)
│  (Dev/Staging)   │
└──────────────────┘
```

The test proxy:
- Runs locally on your machine
- Forwards requests to real PI Web API
- Adds CORS headers (solves browser CORS issues)
- Injects authentication credentials
- Logs requests for debugging

### Test Isolation

Every test creates uniquely named elements to prevent collisions:

```
Original name:  MY_DATAFRAME
Test name:      TEST_T1KJH8A_DF_MY_DATAFRAME_X7B2
                └──┬──┘ └──┬─┘                └┬┘
                   │       │                    └─ Random suffix
                   │       └─ Timestamp (base36)
                   └─ TEST prefix
```

Benefits:
- ✅ Tests can run in parallel
- ✅ Multiple developers can test simultaneously
- ✅ Failed tests don't block future runs
- ✅ Easy to identify and cleanup test elements

### Automatic Cleanup

Test elements are automatically cleaned up:

1. **After each test**: Elements created in that test are deleted
2. **Before test run**: Old test elements (>24h) are deleted
3. **After test suite**: Final cleanup of any remaining elements

Configure cleanup behavior in `.env.test`:

```bash
TEST_CLEANUP=true              # Enable/disable cleanup
TEST_CLEANUP_HOURS=24          # Delete elements older than 24 hours
```

## 📝 Writing Contract Tests

### Example Test

```typescript
import { describe, it, expect } from 'vitest'
import { setupContractTests } from './setup'
import { createTestDataFrameName } from '../utils/test-naming'
import { trackCreatedElement } from '../utils/test-cleanup'
import { createDataFrame } from '../../src/piwebapi/dataframes'

setupContractTests()

describe('My Contract Test', () => {
  it('should create a DataFrame', async () => {
    // Generate unique name
    const dfName = createTestDataFrameName('my_test_df')

    // Create DataFrame
    const df = await createDataFrame(
      userElementWebId,
      { name: dfName },
      'TEST_SID'
    )

    // Track for cleanup
    trackCreatedElement(df.id)

    // Assert
    expect(df.name).toBe(dfName)
  })
})
```

### Best Practices

1. **Always use test naming utilities**:
   ```typescript
   import { createTestDataFrameName, createTestColumnName } from '../utils/test-naming'
   ```

2. **Always track created elements**:
   ```typescript
   trackCreatedElement(element.id)
   ```

3. **Use descriptive test names**:
   ```typescript
   it('should create DataFrame with metadata')
   ```

4. **Test contracts, not implementation**:
   - Validate response schema
   - Check required fields
   - Verify data types

## 🐛 Troubleshooting

### "Test root element not found"

**Problem**: Cannot resolve test root element

**Solutions**:
1. Check `TEST_AF_ROOT_WEBID` is correct (recommended)
2. Or ensure `TEST_AF_ROOT_PATH` exists in the database
3. Verify database name: `TEST_AF_DATABASE`
4. Check permissions on the element

### "Authentication failed"

**Problem**: Cannot authenticate with PI Web API

**Solutions**:
1. Verify credentials in `.env.test`
2. Check domain name (for NTLM): `TEST_PIWEBAPI_DOMAIN`
3. Test manually:
   ```bash
   curl -u "DOMAIN\username:password" https://piwebapi.../system/userinfo
   ```
4. Ensure user has access to test database

### "CORS error"

**Problem**: CORS errors in browser or tests

**Solutions**:
1. Ensure test proxy is running: `pnpm test:proxy`
2. Check proxy URL: `http://localhost:3001`
3. Verify `TEST_PROXY_PORT` in `.env.test`

### "Connection refused"

**Problem**: Cannot connect to PI Web API

**Solutions**:
1. Check `TEST_PIWEBAPI_URL` is correct
2. Ensure PI Web API is accessible from your machine
3. Test with curl or browser
4. Check firewall/network settings

### Tests are slow

**Solutions**:
1. Use WebId instead of path resolution: `TEST_AF_ROOT_WEBID`
2. Reduce cleanup frequency: `TEST_CLEANUP_HOURS=0`
3. Run specific test files instead of all tests

## 🔒 Security Notes

- **Never commit `.env.test`** - contains credentials
- `.env.test` is in `.gitignore`
- Use dedicated test accounts (not production accounts)
- Test database should be isolated from production
- Rotate test credentials regularly

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [PI Web API Documentation](https://docs.osisoft.com/bundle/pi-web-api)
- Project spec: `spec.md`

## 🆘 Getting Help

If you're stuck:

1. Check this README
2. Review example tests in `tests/contract/`
3. Check test logs for error messages
4. Run proxy manually for debugging: `pnpm test:proxy`
5. Ask the team!
