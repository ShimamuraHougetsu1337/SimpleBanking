# Changelog — Simple Banking App

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Planned
- Implement backend NestJS (Auth, User, Account, Transaction, Admin modules)
- Implement frontend React (Login, Register, Dashboard, Transfer, Transactions, Admin pages)
- Docker Compose configurations
- Database migrations and seed datasets setup

---

## [0.1.0] — 2026-06-29

### Added
- Initialize project documentation and agent configuration assets.
- `docs/ARCHITECTURE.md` — Detailed system architectural overview.
- `docs/DATA_MODEL.md` — Database data model with schema mappings for users, accounts, transactions, and refresh_tokens.
- `docs/API_SPEC.md` — API specification describing endpoints for Auth, Account, Transaction, and Admin.
- `docs/SECURITY.md` — Security specification covering DB transactions, locking, idempotency, and Refresh Token Rotation.
- `docs/SEQUENCE_DIAGRAMS.md` — Mermaid sequence diagrams mapping core application flows.
- `docs/FRONTEND_GUIDE.md` — Frontend guidelines documenting routing, Zustand/React Query state architecture, and Ant Design.
- `docs/DEVELOPMENT_GUIDE.md` — Development setups, default credentials, CLI scripts, and troubleshooting steps.
- `.agents/AGENTS.md` — Workspace agent guardrail constraints with Prompt Routing support.
- `.agents/skills/typeorm-transaction/` — Banking database transactions patterns skill.
- `.agents/skills/nestjs-module-scaffold/` — NestJS feature/module scaffolding standards skill.
- `.agents/skills/jwt-refresh-rotation/` — JWT authentication and rotation flows skill.
- `.agents/skills/react-api-layer/` — React client-side Axios/Zustand/Query HTTP handler skill.
- `.agents/skills/docker-compose-setup/` — Dockerized container deployment settings skill.

### Technical Decisions
- **State Management**: Zustand (local/auth state) + React Query (async server state) — Redux Toolkit excluded.
- **UI Library**: Ant Design v5
- **Authentication**: JWT Access Token (15m) + Opaque Refresh Token with Rotation (7d).
- **Admin Module**: Fully required scope.
- **Currency Data Representation**: `numeric(18,2)` database type for financial figures (no floats).
- **Concurrency & Duplication Control**: Pessimistic write locking + Unique idempotency keys.

---

<!-- Template for subsequent entries:

## [x.y.z] — YYYY-MM-DD

### Added
- New features added

### Changed
- Changes to existing features

### Fixed
- Bug fixes completed

### Removed
- Removed features

### Security
- Changes related to security updates

-->
