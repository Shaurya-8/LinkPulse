import { Router, Request, Response } from 'express';
import { config } from "./config"
// import { env } from ';

// ─────────────────────────────────────────────
// Inline OpenAPI spec (avoids runtime yaml parsing dependency)
// ─────────────────────────────────────────────

export function getOpenApiSpec(): object {
  return {
    openapi: '3.1.0',
    info: {
      title: 'LinkPulse API',
      version: '1.0.0',
      description: `
# LinkPulse REST API

Production-grade URL shortener API with analytics, QR codes, team workspaces, and webhooks.

## Authentication

All authenticated endpoints accept either:
- **Bearer token** – \`Authorization: Bearer <access_token>\`
- **API key** – \`X-API-Key: sk_live_<your_key>\`

Obtain tokens via \`POST /api/auth/login\`. API keys are managed at \`POST /api/users/api-keys\`.

## Rate Limiting

| Tier    | Limit                  |
|---------|------------------------|
| Free    | 100 req / 15 min       |
| Premium | 1 000 req / 15 min     |
| API key | Inherits user tier     |

Limits are enforced per IP for unauthenticated requests and per user ID for authenticated requests.
Rate limit headers are returned on every response: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`.

## Webhook Signature Verification

Every delivery includes these headers:
\`\`\`
X-LinkPulse-Signature:  sha256=<hmac>
X-LinkPulse-Event:      link.clicked
X-LinkPulse-Delivery:   <uuid>
X-LinkPulse-Timestamp:  <unix_seconds>
\`\`\`

Verify in Node.js:
\`\`\`js
const crypto = require('crypto');
function verify(secret, payload, timestamp, signature) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(timestamp + '.' + payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
\`\`\`
      `.trim(),
      contact: { name: 'LinkPulse Support', email: 'api@linkpulse.io', url: 'https://linkpulse.io' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: `${config.app.url}:${config.app.port}`, description: 'Current environment' },
      { url: 'https://api.linkpulse.io', description: 'Production' },
    ],
    tags: [
      { name: 'Auth', description: 'Registration, login, token refresh, password reset' },
      { name: 'Links', description: 'Create, read, update, delete, and manage short links' },
      { name: 'Analytics', description: 'Click analytics, time-series, geo, device breakdowns' },
      { name: 'QR Codes', description: 'Generate, brand, and download QR codes' },
      { name: 'Teams', description: 'Workspace & team management with RBAC' },
      { name: 'Webhooks', description: 'Real-time event delivery to your endpoints' },
      { name: 'Users', description: 'Profile, API keys, and link collections' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        ApiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {},
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
          },
        },
        Link: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            shortCode: { type: 'string', example: 'abc123' },
            shortUrl: { type: 'string', example: 'https://lnk.io/abc123' },
            originalUrl: { type: 'string', example: 'https://example.com/very/long/path' },
            title: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'EXPIRED'] },
            clickCount: { type: 'integer' },
            maxClicks: { type: 'integer', nullable: true },
            isPasswordProtected: { type: 'boolean' },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            tags: { type: 'array', items: { type: 'object' } },
          },
        },
        Webhook: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string', example: 'https://linkpulse.com/webhooks/linkpulse' },
            events: { type: 'array', items: { type: 'string', enum: ['link.created', 'link.updated', 'link.deleted', 'link.clicked', 'link.expired', 'team.member_joined', 'team.member_removed'] } },
            isActive: { type: 'boolean' },
            totalDeliveries: { type: 'integer' },
            successfulDeliveries: { type: 'integer' },
            failedDeliveries: { type: 'integer' },
            lastTriggeredAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Resource not found',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        RateLimited: {
          description: 'Too many requests',
          headers: { 'Retry-After': { schema: { type: 'integer' } } },
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
      },
    },
    security: [{ BearerAuth: [] }, { ApiKey: [] }],
    paths: {
      // ── Auth ───────────────────────────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Register a new account', security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['email', 'username', 'password'], properties: {
                    email: { type: 'string', format: 'email' },
                    username: { type: 'string', minLength: 3 },
                    password: { type: 'string', minLength: 8 },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                  }
                }
              }
            },
          },
          responses: {
            '201': { description: 'Account created. Verification email sent.' },
            '409': { description: 'Email or username already taken' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Login and receive tokens', security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['email', 'password'], properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                    rememberMe: { type: 'boolean' },
                  }
                }
              }
            },
          },
          responses: {
            '200': {
              description: 'Login successful', content: {
                'application/json': {
                  schema: {
                    properties: {
                      data: {
                        properties: {
                          accessToken: { type: 'string' },
                          refreshToken: { type: 'string' },
                          user: { type: 'object' },
                        }
                      },
                    }
                  }
                }
              }
            },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'], summary: 'Refresh access token', security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { properties: { refreshToken: { type: 'string' } } } } },
          },
          responses: { '200': { description: 'New token pair issued' } },
        },
      },
      '/auth/forgot-password': {
        post: {
          tags: ['Auth'], summary: 'Request a password reset email', security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { properties: { email: { type: 'string', format: 'email' } } } } } },
          responses: { '200': { description: 'Reset email sent (if account exists)' } },
        },
      },
      '/auth/logout': {
        post: { tags: ['Auth'], summary: 'Invalidate current session', responses: { '200': { description: 'Logged out' } } },
      },
      '/auth/me': {
        get: { tags: ['Auth'], summary: 'Get authenticated user profile', responses: { '200': { description: 'Current user' } } },
      },

      // ── Links ──────────────────────────────────────────────────────────────
      '/links': {
        get: {
          tags: ['Links'], summary: 'List your short links',
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 } },
            { in: 'query', name: 'search', schema: { type: 'string' } },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'EXPIRED'] } },
            { in: 'query', name: 'sortBy', schema: { type: 'string', default: 'createdAt' } },
            { in: 'query', name: 'sortOrder', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          ],
          responses: { '200': { description: 'Paginated list of links' } },
        },
        post: {
          tags: ['Links'], summary: 'Create a short link',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['originalUrl'], properties: {
                    originalUrl: { type: 'string', format: 'uri' },
                    customAlias: { type: 'string', minLength: 3, maxLength: 64 },
                    title: { type: 'string' },
                    password: { type: 'string', description: 'Premium — password-protect this link' },
                    expiresAt: { type: 'string', format: 'date-time' },
                    maxClicks: { type: 'integer', minimum: 1 },
                    redirectType: { type: 'string', enum: ['TEMPORARY', 'PERMANENT'], default: 'TEMPORARY' },
                    tags: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, color: { type: 'string' } } } },
                  }
                }
              }
            },
          },
          responses: {
            '201': { description: 'Link created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Link' } } } },
            '400': { description: 'Validation error or malicious URL detected' },
            '409': { description: 'Custom alias already taken' },
          },
        },
      },
      '/links/{id}': {
        get: { tags: ['Links'], summary: 'Get a link by ID', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Link details' } } },
        patch: { tags: ['Links'], summary: 'Update a link', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { '$ref': '#/components/schemas/Link' } } } }, responses: { '200': { description: 'Updated link' } } },
        delete: { tags: ['Links'], summary: 'Delete a link', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Link deleted' } } },
      },
      '/links/{id}/toggle': {
        patch: { tags: ['Links'], summary: 'Toggle link active/inactive', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status updated' } } },
      },
      '/links/check-alias/{alias}': {
        get: { tags: ['Links'], summary: 'Check custom alias availability', security: [], parameters: [{ in: 'path', name: 'alias', required: true, schema: { type: 'string' } }], responses: { '200': { description: '{ available: boolean }' } } },
      },
      '/links/bulk': {
        post: { tags: ['Links'], summary: 'Bulk create links (Premium)', requestBody: { required: true, content: { 'application/json': { schema: { properties: { links: { type: 'array', items: { type: 'object' }, maxItems: 1000 } } } } } }, responses: { '201': { description: 'Bulk job queued' } } },
      },
      '/links/bulk/jobs/{jobId}': {
        get: { tags: ['Links'], summary: 'Get bulk job status', parameters: [{ in: 'path', name: 'jobId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Job progress and results' } } },
      },

      // ── Analytics ──────────────────────────────────────────────────────────
      '/analytics/dashboard': {
        get: { tags: ['Analytics'], summary: 'Get dashboard overview stats across all links', responses: { '200': { description: 'Aggregate stats' } } },
      },
      '/analytics/{linkId}/summary': {
        get: {
          tags: ['Analytics'], summary: 'Click summary for a link',
          parameters: [
            { in: 'path', name: 'linkId', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'period', schema: { type: 'string', enum: ['24h', '7d', '30d', '90d', 'all'], default: '7d' } },
          ],
          responses: { '200': { description: 'Summary including totalClicks, uniqueVisitors, topCountry, topReferer' } },
        },
      },
      '/analytics/{linkId}/timeseries': {
        get: { tags: ['Analytics'], summary: 'Click time-series data', parameters: [{ in: 'path', name: 'linkId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'period', schema: { type: 'string' } }, { in: 'query', name: 'granularity', schema: { type: 'string', enum: ['hour', 'day'], default: 'day' } }], responses: { '200': { description: 'Array of { date, clicks, uniqueVisitors }' } } },
      },
      '/analytics/{linkId}/geo': {
        get: { tags: ['Analytics'], summary: 'Geographic breakdown', parameters: [{ in: 'path', name: 'linkId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'period', schema: { type: 'string' } }], responses: { '200': { description: 'Array of { country, countryCode, clicks, percentage }' } } },
      },
      '/analytics/{linkId}/devices': {
        get: { tags: ['Analytics'], summary: 'Device breakdown', parameters: [{ in: 'path', name: 'linkId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'period', schema: { type: 'string' } }], responses: { '200': { description: 'Device analytics' } } },
      },
      '/analytics/{linkId}/browsers': {
        get: { tags: ['Analytics'], summary: 'Browser breakdown', parameters: [{ in: 'path', name: 'linkId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Browser analytics' } } },
      },
      '/analytics/{linkId}/referrers': {
        get: { tags: ['Analytics'], summary: 'Traffic sources', parameters: [{ in: 'path', name: 'linkId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Referrer analytics' } } },
      },
      '/analytics/{linkId}/realtime': {
        get: { tags: ['Analytics'], summary: 'Live click feed (Premium)', parameters: [{ in: 'path', name: 'linkId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Last 30 min click data' } } },
      },
      '/analytics/{linkId}/export': {
        get: { tags: ['Analytics'], summary: 'Export analytics as CSV (Premium)', parameters: [{ in: 'path', name: 'linkId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'CSV file download' } } },
      },

      // ── QR Codes ───────────────────────────────────────────────────────────
      '/qr/{linkId}/generate': {
        post: { tags: ['QR Codes'], summary: 'Generate a QR code for a link', parameters: [{ in: 'path', name: 'linkId', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { properties: { foreground: { type: 'string', default: '#000000' }, background: { type: 'string', default: '#ffffff' }, errorLevel: { type: 'string', enum: ['L', 'M', 'Q', 'H'] }, margin: { type: 'integer' } } } } } }, responses: { '201': { description: 'QR code generated with SVG + PNG URLs' } } },
      },
      '/qr/{linkId}/branded': {
        post: { tags: ['QR Codes'], summary: 'Generate branded QR code with logo (Premium)', parameters: [{ in: 'path', name: 'linkId', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { properties: { logoUrl: { type: 'string', format: 'uri' }, foreground: { type: 'string' }, background: { type: 'string' } } } } } }, responses: { '201': { description: 'Branded QR generated' } } },
      },
      '/qr/download/{shortCode}': {
        get: { tags: ['QR Codes'], summary: 'Download QR code file', security: [], parameters: [{ in: 'path', name: 'shortCode', required: true, schema: { type: 'string' } }, { in: 'query', name: 'format', schema: { type: 'string', enum: ['png', 'svg'], default: 'png' } }], responses: { '200': { description: 'Binary file (image/png or image/svg+xml)' } } },
      },

      // ── Webhooks ───────────────────────────────────────────────────────────
      '/webhooks': {
        get: { tags: ['Webhooks'], summary: 'List your webhooks', responses: { '200': { description: 'Array of webhooks (secret omitted)' } } },
        post: {
          tags: ['Webhooks'], summary: 'Create a webhook endpoint',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['name', 'url', 'events'], properties: {
                    name: { type: 'string', example: 'My Click Listener' },
                    url: { type: 'string', example: 'https://yourapp.com/hooks/linkpulse' },
                    events: { type: 'array', items: { type: 'string', enum: ['link.created', 'link.updated', 'link.deleted', 'link.clicked', 'link.expired', 'team.member_joined', 'team.member_removed'] }, example: ['link.clicked', 'link.created'] },
                    description: { type: 'string' },
                  }
                }
              }
            },
          },
          responses: {
            '201': { description: 'Webhook created. `data.secret` is shown **once** — store it securely.' },
            '400': { description: 'Validation error' },
          },
        },
      },
      '/webhooks/events': {
        get: { tags: ['Webhooks'], summary: 'List all supported event types', security: [], responses: { '200': { description: 'Event catalogue' } } },
      },
      '/webhooks/stats': {
        get: { tags: ['Webhooks'], summary: 'Get delivery success-rate stats', responses: { '200': { description: 'Delivery metrics' } } },
      },
      '/webhooks/{webhookId}': {
        get: { tags: ['Webhooks'], summary: 'Get webhook details', parameters: [{ in: 'path', name: 'webhookId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Webhook object' } } },
        patch: { tags: ['Webhooks'], summary: 'Update a webhook', parameters: [{ in: 'path', name: 'webhookId', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { '$ref': '#/components/schemas/Webhook' } } } }, responses: { '200': { description: 'Updated webhook' } } },
        delete: { tags: ['Webhooks'], summary: 'Delete a webhook', parameters: [{ in: 'path', name: 'webhookId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Webhook deleted' } } },
      },
      '/webhooks/{webhookId}/rotate-secret': {
        post: { tags: ['Webhooks'], summary: 'Rotate the signing secret', parameters: [{ in: 'path', name: 'webhookId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'New secret returned once' } } },
      },
      '/webhooks/{webhookId}/deliveries': {
        get: { tags: ['Webhooks'], summary: 'List delivery attempts for a webhook', parameters: [{ in: 'path', name: 'webhookId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'page', schema: { type: 'integer' } }, { in: 'query', name: 'limit', schema: { type: 'integer' } }], responses: { '200': { description: 'Paginated delivery log' } } },
      },
      '/webhooks/deliveries/{deliveryId}/retry': {
        post: { tags: ['Webhooks'], summary: 'Re-queue a failed delivery', parameters: [{ in: 'path', name: 'deliveryId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Delivery re-queued' } } },
      },

      // ── Users ──────────────────────────────────────────────────────────────
      '/users/profile': {
        get: { tags: ['Users'], summary: 'Get user profile', responses: { '200': { description: 'Profile data' } } },
        patch: { tags: ['Users'], summary: 'Update user profile', requestBody: { content: { 'application/json': { schema: { properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, bio: { type: 'string' }, timezone: { type: 'string' } } } } } }, responses: { '200': { description: 'Updated profile' } } },
      },
      '/users/api-keys': {
        get: { tags: ['Users'], summary: 'List API keys', responses: { '200': { description: 'API keys (hash omitted)' } } },
        post: { tags: ['Users'], summary: 'Create an API key', requestBody: { required: true, content: { 'application/json': { schema: { required: ['name'], properties: { name: { type: 'string' }, scopes: { type: 'array', items: { type: 'string' } }, expiresAt: { type: 'string', format: 'date-time' } } } } } }, responses: { '201': { description: 'Raw key shown once' } } },
      },
      '/users/api-keys/{keyId}': {
        delete: { tags: ['Users'], summary: 'Revoke an API key', parameters: [{ in: 'path', name: 'keyId', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Key revoked' } } },
      },
    },
  };
}

// ─────────────────────────────────────────────
// Swagger UI HTML (CDN-based, no npm package needed)
// ─────────────────────────────────────────────

function swaggerUiHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>LinkPulse API Reference</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css"/>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #swagger-ui .topbar { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
    #swagger-ui .topbar-wrapper img { content: url(''); }
    #swagger-ui .topbar-wrapper a::before { content: '🔗 LinkPulse API'; color: white; font-size: 18px; font-weight: 700; }
    .swagger-ui .info .title { color: #4338ca; }
    .swagger-ui .scheme-container { background: white; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${specUrl}',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 2,
    });
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Router (mounted at /api/docs)
// ─────────────────────────────────────────────

export function createDocsRouter(): Router {
  const router = Router();

  // Raw OpenAPI JSON spec
  router.get('/spec.json', (_req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(getOpenApiSpec());
  });

  // Swagger UI
  router.get('/', (_req: Request, res: Response) => {
    const specUrl = `${config.app.url}:${config.app.port}/api/docs/spec.json`;
    res.setHeader('Content-Type', 'text/html');
    res.send(swaggerUiHtml(specUrl));
  });

  return router;
}