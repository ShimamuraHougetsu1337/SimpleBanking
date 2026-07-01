    # ESLint Enforcement

- **After creating or modifying any TypeScript file** in the `backend/` directory, you MUST run ESLint to validate the file(s) before ending your turn:
  ```bash
  # Lint a specific file or directory
  npx eslint src/path/to/file.ts --max-warnings=0

  # Lint the entire backend source
  npx eslint src/ --max-warnings=0
If ESLint reports errors, you MUST fix them before completing the task. Do not leave lint errors in the codebase.

If ESLint reports warnings, evaluate them and fix when reasonably possible. Document any intentionally suppressed warnings with an inline // eslint-disable-next-line comment explaining why.

The backend ESLint config is located at backend/eslint.config.mjs. It uses typescript-eslint with recommendedTypeChecked rules and prettier integration.

Do NOT globally disable ESLint rules in eslint.config.mjs — override rules at the specific line or file level only when strictly necessary.

Run ESLint from the backend/ directory so the parserOptions.projectService can resolve tsconfig.json correctly.