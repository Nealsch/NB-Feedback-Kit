# Cloudflare Setup Guide for NB Feedback Kit API

## Overview

The NB Feedback Kit API is a Cloudflare Worker built with Hono.js. This guide covers everything needed to deploy and configure the API on Cloudflare.

---

## Prerequisites

1. **Cloudflare Account** - Free tier is sufficient for MVP
2. **Wrangler CLI** - Already installed via package dependencies
3. **Cloudflare API Token** - For deployment authentication

---

## Initial Setup (Required Now)

### 1. Authenticate Wrangler

```bash
cd packages/api
pnpm wrangler login
```

This opens a browser for Cloudflare authentication and stores credentials locally.

### 2. Test Local Development

```bash
pnpm dev
```

The API will run locally at `http://localhost:8787`

Test the endpoints:
- `GET http://localhost:8787/` - API info
- `GET http://localhost:8787/health` - Health check

### 3. Deploy to Cloudflare (Development)

```bash
pnpm wrangler deploy --env development
```

This deploys the Worker as `nb-feedback-api-dev` to your Cloudflare account.

### 4. Deploy to Production

```bash
pnpm wrangler deploy --env production
```

This deploys the Worker as `nb-feedback-api-prod`.

---

## Current State (TASK-004)

✅ **What's Working:**
- Hono.js app with CORS configured
- Health check endpoint (`/health`)
- API info endpoint (`/`)
- Request logging
- Global error handling
- 404 handling

🚫 **Not Yet Implemented:**
- API key authentication (TASK-005)
- Rate limiting (TASK-005)
- GitHub integration (TASK-006)
- Feedback submission endpoint (TASK-006)
- Release notes endpoint (TASK-009)
- Roadmap endpoint (TASK-011)

---

## Future Setup Requirements

The following Cloudflare resources will be needed in upcoming tasks:

### TASK-005: API Authentication & Rate Limiting

#### 1. Create KV Namespace for API Keys

```bash
# Development environment
pnpm wrangler kv:namespace create "API_KEYS" --env development

# Production environment
pnpm wrangler kv:namespace create "API_KEYS" --env production
```

After creation, add the namespace IDs to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "API_KEYS"
id = "your-kv-namespace-id-from-command-output"
preview_id = "your-preview-namespace-id"
```

#### 2. Add API Keys to KV Storage

```bash
# Add a test API key
pnpm wrangler kv:key put "demo-key" '{"repository":"owner/repo","name":"Demo App"}' \
  --binding=API_KEYS --env development
```

#### 3. Enable Durable Objects

Durable Objects are used for per-API-key rate limiting.

In `wrangler.toml`, add:

```toml
[durable_objects]
bindings = [
  { name = "RATE_LIMITER", class_name = "RateLimiter" }
]

[[migrations]]
tag = "v1"
new_classes = ["RateLimiter"]
```

No additional Cloudflare dashboard configuration needed - Durable Objects are enabled automatically.

---

### TASK-006: GitHub Integration

#### 1. Create GitHub Personal Access Token (PAT)

1. Go to GitHub Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens
2. Create new token with:
   - **Repository access:** Select repositories where issues will be created
   - **Permissions:**
     - Issues: Read and write
     - Metadata: Read-only
3. Copy the generated token

#### 2. Add GitHub PAT as Cloudflare Secret

```bash
# Development
pnpm wrangler secret put GITHUB_TOKEN --env development
# Paste your GitHub PAT when prompted

# Production
pnpm wrangler secret put GITHUB_TOKEN --env production
# Paste your GitHub PAT when prompted
```

Secrets are encrypted and never exposed in code or logs.

---

## Deployment Workflow

### Development Workflow

1. Make changes to `src/index.ts`
2. Test locally: `pnpm dev`
3. Deploy to dev: `pnpm wrangler deploy --env development`
4. Test at: `https://nb-feedback-api-dev.[your-subdomain].workers.dev`

### Production Deployment

1. Ensure all tests pass
2. Deploy: `pnpm wrangler deploy --env production`
3. Monitor logs: `pnpm wrangler tail --env production`
4. Deployed at: `https://nb-feedback-api-prod.[your-subdomain].workers.dev`

---

## Environment Variables & Bindings

| Binding | Type | Purpose | Task |
|---------|------|---------|------|
| `API_KEYS` | KV Namespace | Store API key → repository mappings | TASK-005 |
| `RATE_LIMITER` | Durable Object | Per-key rate limiting | TASK-005 |
| `GITHUB_TOKEN` | Secret | GitHub API authentication | TASK-006 |

---

## Monitoring & Debugging

### View Logs

```bash
# Real-time logs
pnpm wrangler tail --env production

# Filter by status
pnpm wrangler tail --env production --status error
```

### Check Analytics

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select `nb-feedback-api-prod`
4. View metrics: requests, errors, CPU time, duration

---

## Cost Estimates

### Cloudflare Workers (Free Tier)

- **Requests:** 100,000/day free
- **CPU Time:** 10ms per request
- **Storage:** KV reads/writes included
- **Durable Objects:** 1 million requests/month free

For typical usage (small-medium projects):
- **Expected cost:** $0/month (within free tier)
- **Scale:** Can handle ~3,000 feedback submissions/day

### Paid Tier (if needed)

- Workers: $5/month for 10M requests
- KV: $0.50 per million reads
- Durable Objects: $0.15 per million requests after free tier

---

## Security Considerations

1. **API Keys in KV**
   - Never commit API keys to Git
   - Use Wrangler CLI to populate KV
   - Rotate keys if compromised

2. **GitHub PAT**
   - Store as Cloudflare Secret (encrypted)
   - Use fine-grained tokens with minimal permissions
   - Monitor GitHub token usage in security settings

3. **CORS Configuration**
   - Current: `origin: '*'` (development)
   - Production: Restrict to known domains

4. **Rate Limiting**
   - Implemented in TASK-005
   - Prevents abuse and controls costs

---

## Troubleshooting

### "Wrangler: Not authenticated"

```bash
pnpm wrangler login
```

### "KV namespace not found"

Ensure namespaces are created and IDs added to `wrangler.toml`:

```bash
pnpm wrangler kv:namespace list
```

### "Deployment fails"

Check `wrangler.toml` syntax and ensure all bindings are configured:

```bash
pnpm wrangler deploy --dry-run --env development
```

### "Worker responds with 500 errors"

View real-time logs:

```bash
pnpm wrangler tail --env development --status error
```

---

## Next Steps

1. ✅ **TASK-004 Complete** - API foundation with Hono + health checks
2. ⏳ **TASK-005** - Set up KV namespace, add authentication, implement rate limiting
3. ⏳ **TASK-006** - Add GitHub PAT secret, create feedback endpoint
4. ⏳ **TASK-009** - Implement `/releases` endpoint
5. ⏳ **TASK-011** - Implement `/roadmap` endpoint

---

## Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Hono.js Documentation](https://hono.dev/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
