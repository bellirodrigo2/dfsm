# Contract Tests - Quick Start Guide

Get up and running with contract tests in 5 minutes.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Test Environment

```bash
# Copy template
cp .env.test.example .env.test

# Edit with your credentials
notepad .env.test  # or use your favorite editor
```

**Minimum required configuration:**

```bash
TEST_PIWEBAPI_URL=https://your-piwebapi.com/piwebapi
TEST_PIWEBAPI_USERNAME=your_username
TEST_PIWEBAPI_PASSWORD=your_password
TEST_PIWEBAPI_DOMAIN=YOUR_DOMAIN
TEST_AF_ROOT_WEBID=F1AbCDe...  # Get from PI System Explorer
```

### 3. Run Tests

```bash
# Run contract tests
pnpm test:contract

# Or run unit tests (no setup needed)
pnpm test:unit
```

## 🎯 Common Commands

```bash
# Unit tests (fast, with mocks)
pnpm test
pnpm test:unit

# Contract tests (real API)
pnpm test:contract
pnpm test:contract:watch

# Start proxy manually (for debugging)
pnpm test:proxy

# Run all tests
pnpm test:all
```

## 🐛 Quick Troubleshooting

### Can't connect to PI Web API?

```bash
# Test URL
curl https://your-piwebapi.com/piwebapi/system

# Test with auth
curl -u "DOMAIN\username:password" https://your-piwebapi.com/piwebapi/system/userinfo
```

### Can't find test root element?

1. Open PI System Explorer
2. Navigate to: `AF Server > Database > Your Root Element`
3. Right-click → Properties → Copy WebId
4. Put in `.env.test`: `TEST_AF_ROOT_WEBID=<paste here>`

### Tests are failing with 401/403?

- Check username and password in `.env.test`
- Verify domain name (for NTLM)
- Ensure user has permissions on test database

## 📚 Full Documentation

See [README.md](./README.md) for complete documentation.

## ✅ You're Ready!

If tests pass, your environment is configured correctly. Start writing your contract tests!
