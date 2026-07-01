# Agent Rules — Simple Banking App (Dispatcher)

> These rules apply to all agents working in the `SimpleBankingApp` workspace.
> This is the central dispatcher. Before starting to code, evaluate the task and use the `view_file` tool to read the corresponding `SKILL.md` files required for your context.

## [ROUTE: skill-routing] — Applies when: evaluating a new task

Evaluate if your task falls into any of the specialized categories below. If it does, you **MUST** read the corresponding file before taking any action.

**1. Core Project Domains (Always check these first based on the stack you touch):**
- **Writing any TypeScript file** ➜ Read `.agents/skills/coding-conventions/SKILL.md`
- **Backend development (NestJS, Database, Auth, Transactions)** ➜ Read `.agents/skills/backend-development/SKILL.md`
- **Frontend development (React, UI, API, Hooks, Tables)** ➜ Read `.agents/skills/frontend-development/SKILL.md`
- **Modifying auth layers, database queries, inputs, or env files** ➜ Read `.agents/skills/security/SKILL.md`
- **Linting, ESLint fixes, or finishing a TypeScript file edit** ➜ Read `.agents/skills/eslint-enforcement/SKILL.md`

**2. Specialized Capabilities & Workflows:**
- **User uses commands: /explain, /walkthrough, /review, /optimize** ➜ Read `.agents/skills/code-assistant-commands/SKILL.md`
- **Docker Compose, Containerization, or Deployment** ➜ Read `.agents/skills/docker-compose-setup/SKILL.md`
- **User uses command: /commit_message** ➜ Read `.agents/skills/commit-message/SKILL.md`

## Rules Priority in Case of Conflict

If instructions from different loaded skills appear to conflict, resolve them using the following priority order:
1. `security` — Security measures always take precedence.
2. `backend-development` — Backend application logic, Database, and Auth.
3. `frontend-development` — Frontend application logic, UI, and API.
4. `coding-conventions` — General code formatting.
5. `eslint-enforcement` — Code quality gate, applied after every TypeScript edit.