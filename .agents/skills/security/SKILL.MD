# Security Guidelines

- **NEVER** commit actual `.env` files to Git repositories — ensure `.env` is listed in `.gitignore`.
- **NEVER** print or log sensitive information, such as passwords, raw tokens, or security keys.
- Perform strict application validation on transfer amounts: must be > 0, maximum 2 decimal places, and less than or equal to the available balance.
- Check destination account existence and status before initiating transfers.
- Administrators cannot lock their own accounts.
- Users must only access their own records — enforce boundaries by fetching `userId` from the verified JWT payload rather than trusting payload bodies or query parameters.
- Restrict CORS permissions to the defined `FRONTEND_URL` in backend configurations.
- Enforce rate-limiting constraints on `/auth/login` and `/auth/refresh` endpoints via `@nestjs/throttler`.