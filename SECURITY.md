# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | Yes |

## Reporting a Vulnerability

We take the security of FlowForge seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Do NOT open a public GitHub issue
- Do NOT discuss the vulnerability in public channels
- Do NOT exploit the vulnerability beyond what is necessary to discover it

### DO

1. **Email us** at security@flowforge.dev with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

2. **Wait for a response** within 48 hours

3. **Allow time for a fix** before public disclosure (90 days recommended)

## Security Measures

### Authentication

- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens expire after 15 minutes
- Refresh tokens rotate on each use (old tokens are revoked)
- Refresh tokens are stored in the database and can be revoked individually or all at once
- Password change automatically revokes all active sessions

### Data Protection

- Database connections use SSL/TLS
- Secrets are encrypted at rest
- Environment variables for sensitive configuration
- No sensitive data in logs

### API Security

- CORS configured with allowed origins
- Rate limiting (100 requests/minute per IP)
- Input validation with Zod schemas on all endpoints
- JWT verification on protected routes
- Authorization checks for workspace access

### Infrastructure

- PostgreSQL with connection pooling
- Redis with password authentication
- Workers run in isolated processes
- Dead-letter queue for failed jobs

## Best Practices for Contributors

1. **Never commit secrets** to the repository
2. **Use environment variables** for all sensitive configuration
3. **Validate all inputs** with Zod schemas
4. **Use parameterized queries** (handled by Prisma)
5. **Implement proper authorization** for all protected routes
6. **Log security events** (login attempts, password changes, etc.)
7. **Keep dependencies updated** (`pnpm update`)
8. **Use HTTPS** in production

## Dependencies

We regularly audit and update our dependencies. Known vulnerable packages are updated immediately when patches are available.

## Security Checklist for Pull Requests

- [ ] No hardcoded secrets or API keys
- [ ] All user input is validated
- [ ] Authentication required for protected routes
- [ ] Authorization verified for resource access
- [ ] No sensitive data in error messages or logs
- [ ] Rate limiting considered for new endpoints
- [ ] CORS configuration reviewed
