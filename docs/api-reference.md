# API Reference

Base URL: `http://localhost:3000/api/v1`

All authenticated endpoints require an `Authorization: Bearer <accessToken>` header.

## Authentication

### POST `/auth/register`

Create a new user account.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "john@example.com", "name": "John Doe" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Validation Rules:**
- `name`: 1-100 characters
- `email`: valid email format, unique
- `password`: minimum 8 characters

---

### POST `/auth/login`

Sign in with email and password.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "john@example.com", "name": "John Doe" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### POST `/auth/refresh`

Refresh an expired access token using a valid refresh token. Implements token rotation — the old refresh token is revoked and a new pair is issued.

**Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "john@example.com", "name": "John Doe" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### GET `/auth/me`

Get the currently authenticated user.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

---

### PUT `/auth/password`

Change your password. Revokes all active sessions on success.

**Headers:** `Authorization: Bearer <accessToken>`

**Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newsecurepassword456"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### POST `/auth/logout`

Revoke a refresh token (single session) or all tokens (all sessions).

**Headers:** `Authorization: Bearer <accessToken>`

**Body (single session):**
```json
{
  "refreshToken": "eyJ..."
}
```

**Body (all sessions):**
```json
{
  "all": true
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

## Workspaces

### POST `/workspaces`

Create a new workspace. The authenticated user becomes the workspace owner.

**Headers:** `Authorization: Bearer <accessToken>`

**Body:**
```json
{
  "name": "My Team",
  "slug": "my-team"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Team",
    "slug": "my-team",
    "ownerId": "uuid"
  }
}
```

---

### GET `/workspaces`

List workspaces where the user is a member.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "My Team", "slug": "my-team", "role": "owner" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

---

### GET `/workspaces/:id`

Get a specific workspace.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Team",
    "slug": "my-team",
    "ownerId": "uuid",
    "members": [
      { "userId": "uuid", "email": "john@example.com", "role": "owner" }
    ]
  }
}
```

---

### PATCH `/workspaces/:id`

Update workspace name or slug.

**Headers:** `Authorization: Bearer <accessToken>`

**Body:**
```json
{
  "name": "Updated Name"
}
```

---

### DELETE `/workspaces/:id`

Delete a workspace (owner only).

**Headers:** `Authorization: Bearer <accessToken>`

---

## Workflows

### POST `/workflows`

Create a new workflow in a workspace.

**Headers:** `Authorization: Bearer <accessToken>`

**Body:**
```json
{
  "workspaceId": "uuid",
  "name": "Email Notification Workflow",
  "description": "Sends an email when a webhook is received"
}
```

---

### GET `/workflows`

List workflows in a workspace.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
- `workspaceId` (required)
- `status` (optional: draft/published/archived)
- `page`, `limit`

---

### GET `/workflows/:id`

Get a workflow with its latest version.

**Headers:** `Authorization: Bearer <accessToken>`

---

### PATCH `/workflows/:id`

Update workflow metadata.

**Headers:** `Authorization: Bearer <accessToken>`

---

### DELETE `/workflows/:id`

Delete a workflow and all its versions.

**Headers:** `Authorization: Bearer <accessToken>`

---

## Executions

### POST `/executions`

Run a workflow manually.

**Headers:** `Authorization: Bearer <accessToken>`

**Body:**
```json
{
  "workflowId": "uuid",
  "input": { "key": "value" }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "workflowId": "uuid"
  }
}
```

---

### GET `/executions`

List executions for a workflow.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
- `workflowId` (required)
- `status` (optional)
- `page`, `limit`

---

### GET `/executions/:id`

Get execution details including node results and logs.

**Headers:** `Authorization: Bearer <accessToken>`

---

### POST `/executions/:id/cancel`

Cancel a running execution.

**Headers:** `Authorization: Bearer <accessToken>`

---

### POST `/executions/:id/retry`

Retry a failed execution from the beginning.

**Headers:** `Authorization: Bearer <accessToken>`

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- Default: 100 requests per minute per IP
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
