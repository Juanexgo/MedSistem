# MediFlow — Hospital Logistics & Patient Transport Management System

A full-stack hospital operations management platform built with NestJS, Next.js, PostgreSQL, and real-time WebSockets. MediFlow streamlines patient transport, oxygen tank tracking, shift management, team communication, and security incident monitoring for hospital environments.

## Architecture

```
mediflow/
├── apps/
│   ├── api/          # NestJS REST API (port 4000)
│   └── web/          # Next.js 14 App Router frontend (port 3000)
├── packages/
│   └── shared/       # Shared TypeScript types and enums
├── docker-compose.yml
├── turbo.json        # Turborepo v2 configuration
└── package.json      # Workspace root
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Real-time | Socket.IO (WebSocket) |
| Auth | JWT (Access + Refresh tokens), bcrypt |
| State | Zustand (client state), React Query (server state) |
| Validation | class-validator, class-transformer |
| API Docs | Swagger / OpenAPI |
| QR Codes | qrcode library |
| Security | Helmet, CORS, Rate Limiting, RBAC |
| Container | Docker, docker-compose |

## Key Features

### Patient Transport Management
- Create, assign, and track patient transfers in real-time
- 10-status workflow (Requested → Assigned → On The Way → ... → Completed)
- Priority system: URGENT, HIGH, NORMAL, SCHEDULED
- Support for oxygen-equipped transports with doctor companion
- QR code tracking for public status viewing

### Real-time Operations Dashboard
- Live KPI metrics (active transports, SLA compliance, response times)
- Hourly volume bar charts and priority distribution pie charts
- Zone saturation monitoring
- Transporter availability overview
- Auto-refreshing activity timeline
- Critical alerts (low oxygen, pending handoffs, important comments)

### Oxygen Tank Management
- Full CRUD for oxygen tank inventory
- Level tracking with automatic status calculation (FULL/MEDIUM/LOW/CRITICAL)
- Low/critical alerts with manager notifications
- Tank assignment to transfers with clinical rule validation

### Shift Management & Handoff
- Time-based shift type detection (Morning/Evening/Night)
- Shift start/end with auto-generated shift codes
- Detailed handoff documentation (completed services, pending items, incidents)
- Pending handoff tracking and alerts

### Communication Center
- Operations feed with categorized comments (7 types: Patient Not Ready, Delay, Incident, etc.)
- Severity levels: INFO, WARNING, CRITICAL
- Important flagging with manager escalation
- Resolve/close workflow
- Linked transfer references

### Security Incident Tracking
- Automatic detection of security events (failed logins, token reuse, access denied)
- Severity classification and resolution workflow
- Full audit trail integration

### Audit Trail
- Complete action logging for all system operations
- Before/after data snapshots for changes
- IP address and user agent tracking
- CSV export for compliance

### Hospital Map
- Real-time SVG zone map showing active transfer counts
- Saturation detection and visual indicators
- Zone detail panel with current status

### Role-Based Access Control
- 5 roles: Admin, Head Nurse, Transporter, Auditor, Doctor
- Granular permission system (20+ permissions)
- UI elements hidden based on permissions
- API endpoints protected by permission guards

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 16 (or Docker)
- npm 9+

### 1. Clone and Install
```bash
git clone <repo-url>
cd mediflow
npm install
```

### 2. Start PostgreSQL
```bash
# Using Docker (recommended)
docker compose up -d postgres

# Or use your local PostgreSQL instance
# Create database: mediflow
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env if needed (defaults work for local Docker setup)
```

### 4. Setup Database
```bash
cd apps/api
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
cd ../..
```

### 5. Start Development Servers
```bash
# Terminal 1 - API
cd apps/api && npm run start:dev

# Terminal 2 - Web
cd apps/web && npm run dev
```

### 6. Access the Application
- Web UI: http://localhost:3000
- API: http://localhost:4000/api/v1
- Swagger Docs: http://localhost:4000/api/v1/docs

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` — Login with email/password
- `POST /api/v1/auth/refresh` — Refresh JWT tokens
- `POST /api/v1/auth/logout` — Logout current session
- `POST /api/v1/auth/logout-all` — Logout all sessions
- `GET /api/v1/auth/me` — Get current user profile

### Transfers
- `GET /api/v1/transfers` — List transfers (filters, pagination)
- `POST /api/v1/transfers` — Create transfer
- `GET /api/v1/transfers/:id` — Get transfer details
- `PUT /api/v1/transfers/:id` — Update transfer
- `PUT /api/v1/transfers/:id/status` — Update status
- `POST /api/v1/transfers/:id/cancel` — Cancel transfer

### Dashboard
- `GET /api/v1/dashboard/full` — Full dashboard data
- `GET /api/v1/dashboard/metrics` — Metrics only
- `GET /api/v1/dashboard/transporters` — Transporter availability
- `GET /api/v1/dashboard/zones` — Zone saturation
- `GET /api/v1/dashboard/oxygen` — Oxygen summary

### Oxygen
- `GET /api/v1/oxygen` — List tanks
- `POST /api/v1/oxygen` — Create tank
- `GET /api/v1/oxygen/alerts` — Get oxygen alerts
- `PUT /api/v1/oxygen/:id/level` — Update tank level

### Shifts
- `POST /api/v1/shifts/start` — Start shift
- `POST /api/v1/shifts/end` — End shift
- `GET /api/v1/shifts/type` — Current shift type
- `GET /api/v1/shifts/current` — Current user shift
- `GET /api/v1/shifts/active` — All active shifts
- `GET /api/v1/shifts/history` — Shift history
- `GET /api/v1/shifts/pending-handoff` — Shifts needing handoff

### Communications
- `GET /api/v1/comments` — List comments (filters)
- `POST /api/v1/comments` — Create comment
- `POST /api/v1/comments/:id/important` — Mark as important
- `POST /api/v1/comments/:id/resolve` — Resolve comment
- `POST /api/v1/comments/:id/close` — Close comment

### Security
- `GET /api/v1/security-incidents` — List incidents
- `POST /api/v1/security-incidents/:id/resolve` — Resolve incident

### Audit
- `GET /api/v1/audit` — List audit logs (filters)

### Reports
- `GET /api/v1/exports/transfers` — Export transfers CSV
- `GET /api/v1/exports/audit-logs` — Export audit logs CSV

### Zones & Map
- `GET /api/v1/zones` — List zones with active counts

### Real-time (WebSocket)
- Socket.IO at `http://localhost:4000`
- Authentication via JWT token in auth/token/query
- Room-based subscriptions per user and role

## Security Features

- **JWT Access + Refresh Token Rotation**: Short-lived access tokens (15 min) with rotating refresh tokens
- **bcrypt Password Hashing**: 12 salt rounds for password storage
- **Rate Limiting**: 100 requests/minute general, 5 requests/5 minutes for login
- **Helmet Security Headers**: CSP, HSTS, XSS protection, frame guard, no sniff
- **CORS**: Strict origin configuration with credentials support
- **Input Validation**: Whitelist-based validation with class-validator
- **RBAC**: Granular permission-based access control (20+ permissions)
- **Audit Logging**: All CRUD operations, logins, and security events logged
- **Security Incidents**: Automatic detection of brute force, token reuse, access denial
- **Session Management**: Refresh token tracking with device/IP information
- **Soft Deletes**: Data preserved via deletedAt timestamps instead of hard deletes

## Realtime Events

MediFlow uses Socket.IO for real-time updates across all connected clients:

- `transfer.created`, `transfer.updated`, `transfer.status_changed`
- `assignment.created`, `assignment.reassigned`
- `comment.created`, `comment.important`
- `notification.created`
- `security.incident_created`
- `shift.started`, `shift.ended`, `shift.handoff_created`
- `oxygen.tank_updated`, `oxygen.tank_low`, `oxygen.tank_critical`
- `dashboard.metrics_updated`
- `transporter.status_changed`

## Project Structure

```
apps/api/src/
├── audit/              # Audit service
├── common/             # Guards, decorators, Prisma module
├── config/             # Configuration
├── modules/
│   ├── assignments/    # Transporter assignment
│   ├── auth/           # Authentication
│   ├── comments/       # Communication center
│   ├── communication/  # Operations center
│   ├── dashboard/      # Dashboard metrics
│   ├── events/         # WebSocket gateway + service
│   ├── exports/        # CSV exports
│   ├── notifications/  # User notifications
│   ├── operations-log/ # Unified timeline
│   ├── oxygen/         # Tank management
│   ├── patients/       # Patient records
│   ├── roles/          # RBAC roles
│   ├── security-incidents/ # Security events
│   ├── shift-handoff/  # Shift handoff
│   ├── shifts/         # Shift management
│   ├── tracking/       # Public tracking
│   ├── transfers/      # Transfer management
│   ├── users/          # User management
│   └── zones/          # Hospital zones
└── security/           # JWT strategy
```

## Deployment

### Docker (Production)
```bash
# Build and start all services
docker compose up -d --build

# Or deploy individual services
docker compose up -d postgres api web
```

### Manual Production Build
```bash
# Build all packages
npm run build

# Start API
cd apps/api && NODE_ENV=production node dist/main

# Start Web
cd apps/web && NODE_ENV=production npm start
```

### Production Checklist
- [ ] Change JWT secrets to strong random values (32+ characters)
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origin for your domain
- [ ] Enable HTTPS with a valid certificate
- [ ] Set up a production PostgreSQL instance with backups
- [ ] Configure proper rate limits for your load
- [ ] Review CSP directives for your deployment
- [ ] Set up monitoring and logging
- [ ] Regular security updates for dependencies

## Troubleshooting

### Database Connection Issues
```
# Ensure PostgreSQL is running
docker compose ps
# Check logs
docker compose logs postgres
# Verify DATABASE_URL in .env
```

### Build Errors
```bash
# Clear caches and reinstall
rm -rf node_modules apps/*/node_modules
npm install
npx prisma generate
```

### WebSocket Connection Issues
- Ensure CORS_ORIGIN matches your web app URL
- Check that both API and Web servers are running
- Verify JWT is valid (token expires after 15 minutes)

## License

MIT
