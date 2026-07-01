# Frontend React Conventions

- All HTTP requests must go through the central Axios instance configured in `src/services/api.ts`.
- The Axios instance must include a **request interceptor** that automatically appends the `Authorization: Bearer <accessToken>` header.
- The Axios instance must configure a **response interceptor** to handle automatic refresh on `401` errors:
  - Intercept HTTP `401` → request `POST /auth/refresh` to get a new access token.
  - Retry the failed original request with the new access token.
  - If refresh fails → clear the auth state and redirect the client to `/login`.
- Leverage **React Query** (`useQuery`, `useMutation`) for all server state orchestration. Do not trigger manual fetch operations inside `useEffect`.
- **ALWAYS invalidate query caches (`queryClient.invalidateQueries(...)`)** when you update, create, or delete data to ensure the UI stays synchronized with the backend state.
- Leverage **Zustand** to manage local client states (authenticated user, tokens, global loading, modals).
- **DO NOT** use Redux Toolkit in this project.
- Wrap secure views in a `<ProtectedRoute>` component to redirect unauthenticated traffic to `/login`.
- Wrap admin-only views in an `<AdminRoute>` component to check if the user has `role === 'admin'`.
- Never hardcode the base API URL — reference `import.meta.env.VITE_API_BASE_URL`.