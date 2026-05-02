# Authentication

FlowForge uses JWT-based authentication with short-lived access tokens and rotating refresh tokens stored in the database for revocation support.

## Token Types

| Token Type | Lifetime | Purpose | Storage |
|------------|----------|---------|---------|
| Access Token | 15 minutes | API request authorization | Client (memory/localStorage) |
| Refresh Token | 7 days | Obtaining new access tokens | Database (revocable) |

## Token Payload

### Access Token
```json
{
  "userId": "uuid",
  "email": "john@example.com",
  "role": "developer",
  "workspaceId": "uuid",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Refresh Token
```json
{
  "userId": "uuid",
  "email": "john@example.com",
  "type": "refresh",
  "iat": 1234567890,
  "exp": 1235172690
}
```

## Authentication Flow

### Registration

```
POST /api/v1/auth/register
  ↓
1. Validate input (name, email, password)
2. Check if email already exists → 409 Conflict
3. Hash password with bcrypt (12 rounds)
4. Create user in database
5. Generate access + refresh token pair
6. Store refresh token in database
7. Return tokens to client
```

### Login

```
POST /api/v1/auth/login
  ↓
1. Validate input (email, password)
2. Find user by email
3. Compare password with bcrypt hash
4. Generate access + refresh token pair
5. Store refresh token in database
6. Return tokens to client
```

### Access Token Refresh (Rotation)

```
POST /api/v1/auth/refresh
  ↓
1. Validate refresh token format
2. Look up token in database
3. Check if revoked → 401 if yes
4. Check if expired → revoke + 401 if yes
5. Verify JWT signature
6. Revoke current refresh token
7. Generate new access + refresh token pair
8. Store new refresh token in database
9. Return new tokens to client
```

### Logout

```
POST /api/v1/auth/logout
  ↓
1. Verify access token
2. If { all: true } → revoke ALL refresh tokens for user
3. Else → revoke specific refresh token
4. Return success
```

### Password Change

```
PUT /api/v1/auth/password
  ↓
1. Verify access token
2. Validate current + new password
3. Compare current password with hash
4. Hash new password
5. Update user record
6. Revoke ALL refresh tokens (forces re-login)
7. Return success
```

## Security Measures

### Password Security
- **bcrypt hashing** with 12 rounds (configurable)
- Minimum 8 character password requirement
- Current password verification required for password change

### Token Security
- **Short-lived access tokens** (15 minutes) limit exposure window
- **Refresh token rotation** prevents token replay attacks
- **Database-backed revocation** enables immediate session termination
- **Unique token values** allow individual session management

### Session Management
- Single logout revokes one session
- "Logout all" revokes all active sessions
- Password change revokes all sessions automatically

## Using Auth in the Frontend

### Storing Tokens

```typescript
// Store after login/register
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);
```

### Making Authenticated Requests

```typescript
const response = await fetch('/api/v1/workflows', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

### Token Refresh Logic

```typescript
async function getValidToken() {
  let accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) return null;
  
  // Check if token is expiring soon (within 2 minutes)
  const payload = JSON.parse(atob(accessToken.split('.')[1]));
  const expiresAt = payload.exp * 1000;
  
  if (Date.now() > expiresAt - 120000) {
    // Refresh token
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: localStorage.getItem('refreshToken'),
      }),
    });
    
    const data = await response.json();
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    
    return data.data.accessToken;
  }
  
  return accessToken;
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (required) | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Refresh token lifetime |

## API Guard Pattern

Protected routes use Fastify middleware:

```typescript
// Request is decorated with user info
request.user = { id, email, role, workspaceId }

// Route handler accesses it directly
const { userId } = request.user;
```
