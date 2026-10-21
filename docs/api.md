# ReviewQR API

`/api/v1` is the JSON API for the mobile app and for new web calls. The OpenAPI document is `GET /api/v1/openapi.json`. Older `/api/*` routes keep their current JSON and URLs.

## Shape

Success is `{ "data": ... }`. A list is `{ "data": { "items": [], "nextCursor": null } }`. Some payloads add fields next to `items`, such as `summary` on orders and `unread` on notifications.

Errors are `{ "error": { "code": "...", "message": "..." } }`.

| Code | HTTP |
| --- | --- |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION` | 400 |
| `RATE_LIMIT` | 429 |
| `PLAN_LIMIT` | 402 |
| `CONFLICT` | 409 |
| `INTERNAL` | 500 |

`POST /api/v1/businesses/{id}/qr-codes/claim` returns `409 CONFLICT` when the caller must send the same body again with `confirm: true`.

Cursor pages default to 20 rows and accept `limit` from 1 to 100. `cursor` is opaque. Pass `nextCursor` back as `cursor`. A bad cursor is `400`.

Every `/api/v1` response includes `x-request-id`. Send one to keep a call tied to its log line. Logs record that id, the method, the path, the status, and the duration. They do not record bodies, passwords, refresh tokens, or OTP codes.

## Auth

Send `Authorization: Bearer <accessToken>`. The access token lasts 15 minutes and is checked against the user row, so the role in the token is not what authorization uses. If the header is absent, a NextAuth session cookie is accepted. A bad bearer is `401` even when the cookie is valid. This API does not follow admin impersonation.

`POST /api/v1/auth/otp/request` always returns `{ "data": { "sent": true } }` for a well-formed number. `devCode` is added only when `NODE_ENV` is not `production` and `OTP_DEV_REVEAL` is set. Production ignores the flag.

Refresh tokens rotate. Sending a used refresh token revokes that whole family. Logout revokes the family and still returns `{ "data": { "ok": true } }` for an unknown token. The access token stays valid until it expires.

## Permission matrix

Two different roles are easy to mix up.

`UserRole` is the account: `USER`, `ADMIN`, `AGENCY`, `STAFF`, `AGENT`.

`SubscriptionTier` is the plan: `FREE`, `STARTER`, `GROWTH`, `AGENCY`. A tier named `AGENCY` is not the `AGENCY` account role, and it does not change prices here.

`BusinessMemberRole` is membership on one shop: `MANAGER` or `STAFF`. That `STAFF` is not platform `UserRole.STAFF`.

| Who | Admin `/admin` | Create a business | Read a shop | Manage a shop | Archive a shop | Activate stock |
| --- | --- | --- | --- | --- | --- | --- |
| `ADMIN` | yes | yes | shops they can open | yes | only as owner | shops they manage |
| `AGENT` | no | yes, and `agentId` is themselves | owned or `agentId` | yes on those | only as owner | those shops only |
| `USER` or account `AGENCY` | no | yes, within the plan | owner, or member | owner or `MANAGER` | owner only | shops they manage |
| Platform `STAFF` | no | no | only as a member | only as `MANAGER` | no | only as `MANAGER` |
| Member `STAFF` | no | no | that shop | no | no | no |
| Member `MANAGER` | no | no | that shop | yes | no | yes |

An agent who creates a shop is both `ownerId` and `agentId`. Access is `OWNER`. An agent assigned to someone else's shop (`agentId` only) can manage it, including stock activation, and cannot open `/admin`. Plan limits count businesses and QR codes the person owns, not shops they are only assigned to.

The business list, reviews, campaigns, and AI pages show shops you own or are assigned to. The switcher, orders, feedback, and QR tools also include shops where you are a member, and the member role still decides read versus manage.

## Resources

| Method | Path |
| --- | --- |
| POST | `/api/v1/auth/otp/request` |
| POST | `/api/v1/auth/otp/verify` |
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/refresh` |
| POST | `/api/v1/auth/logout` |
| GET, PATCH, DELETE | `/api/v1/me` |
| GET, DELETE | `/api/v1/me/sessions` and `/api/v1/me/sessions/{id}` |
| POST, DELETE | `/api/v1/push-devices` |
| GET, POST | `/api/v1/businesses` |
| GET, PATCH, DELETE | `/api/v1/businesses/{id}` |
| GET, PUT | `/api/v1/businesses/{id}/store` |
| GET, POST | `/api/v1/businesses/{id}/menu` |
| GET, POST | `/api/v1/businesses/{id}/offers` |
| GET | `/api/v1/businesses/{id}/coupons` |
| GET, POST, PATCH | `/api/v1/businesses/{id}/qr-codes` |
| POST | `/api/v1/businesses/{id}/qr-codes/claim` |
| GET | `/api/v1/orders` |
| POST | `/api/v1/orders/{id}/status` |
| GET | `/api/v1/feedback` |
| PATCH | `/api/v1/feedback/{id}` |
| POST | `/api/v1/feedback/{id}/reply-draft` |
| GET | `/api/v1/notifications` |
| POST | `/api/v1/notifications/read` |
| POST | `/api/v1/uploads` |

Menu `POST` uses the same actions as the dashboard: category, item, update, delete, template, items, variant, variant-update, variant-delete, addon, addon-update, addon-delete, bulk-price, duplicate. Photos travel on `photo` and `photos`. Feedback `PATCH` sets status, an internal note, or erases contact. It does not email the customer. Reply draft only suggests text.

Uploads are multipart, field `file`, optional `variant` of `logo` or `cover`, maximum 8MB.

`DELETE /api/v1/me` with `{ "confirm": "DELETE" }` anonymizes the account and keeps payment rows. Admin accounts are refused.
