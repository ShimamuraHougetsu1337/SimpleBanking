# Backend NestJS Conventions

- Each domain feature must occupy its own NestJS module: `AuthModule`, `UserModule`, `AccountModule`, `TransactionModule`, `AdminModule`.
- Mandatory folder structure per module: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `entities/`, `dto/`.
- **Controller Layer**: Handles HTTP requests/responses only. NO business logic allowed. Controllers should only retrieve parameters (`@Body()`, `@Param()`, `@Query()`), invoke services, and return responses.
- **Service Layer**: Handles core business logic. Do not execute raw SQL strings directly. Use TypeORM repositories or the `EntityManager`.
- **Repository/Entity Layer**: Handles CRUD and query operations only. NO business logic.
- All request payloads must be defined via DTO classes validated with `class-validator` decorators.
- Protect all authenticated endpoints with the `@UseGuards(JwtAuthGuard)` decorator.
- Protect admin-restricted endpoints with `@UseGuards(JwtAuthGuard, RolesGuard)` and the `@Roles('admin')` decorator.
- Use a custom parameter decorator `@CurrentUser()` to extract user details from the JWT request object. Avoid using `@Req()` to prevent `any` typing.
- Configure the global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`.
- Exclude `passwordHash` or other sensitive fields from API responses using `@Exclude()` and the `ClassSerializerInterceptor`.
- Always use TypeORM parameterized queries — **NEVER** build queries via string concatenation.
- Return standardized API error formats and correct HTTP status codes as specified in `API_SPEC.md`.