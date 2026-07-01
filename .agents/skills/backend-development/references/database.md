# Database & TypeORM Guidelines

- Apply schema changes exclusively through **TypeORM migrations** — **DO NOT** enable `synchronize: true` in production (limit synchronization to local dev configurations).
- Keep seeding logic in `src/database/seeds/` — execute seeds separately, do not embed them inside migration files.
- Seed datasets must include at least: **2 customer accounts** and **1 admin account** with sufficient transaction history for demo purposes.
- Migration file naming standard: `timestamp_describe_change` (e.g., `1719624000000_create_users_table`).
- Define entities in the `entities/` folder inside their respective domain modules. Do not write entities into a global folder.
- Add `createdAt` and `updatedAt` timestamps to all entity tables.
- Explicitly map monetary attributes in entities using `@Column({ type: 'numeric', precision: 18, scale: 2 })`.