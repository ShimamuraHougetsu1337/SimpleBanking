---
name: clean-react-components
description: >
  Guidelines for applying Clean Code and Single Responsibility Principle (SRP) in React,
  specifically separating business/state logic into custom hooks and keeping components purely presentational.
  Triggers when: refactoring React components, writing hooks, or reviewing frontend code quality.
---

# Skill: Clean React Components & SRP (Single Responsibility Principle)

## When to Use This Skill

Use this skill when creating, modifying, or refactoring React components and custom hooks. It ensures a strict separation of concerns, readability, testability, and adherence to clean React architecture.

## Core Guidelines

### 1. Separation of Concerns (Logic vs. Presentation)
- **Logic in Custom Hooks**: All state management, side effects (`useEffect`), data fetching (React Query), calculations, and event handlers must be moved into custom hooks (e.g., `useTransfer.ts`).
- **Components are Presentational**: React components should only be responsible for rendering the UI. They should call custom hooks to retrieve state and handlers, then pass them to children or Ant Design components.
- **Example**:
  ```tsx
  // GOOD: Clean presentation component
  export const TransferForm = () => {
    const { form, onFinish, loading } = useTransfer();
    
    return (
      <Form form={form} onFinish={onFinish}>
        <Button loading={loading} htmlType="submit">Submit</Button>
      </Form>
    );
  };
  ```

### 2. Single Responsibility Principle (SRP)
- **Small, Focused Components**: A component should have one reason to change. If a component does multiple things (e.g., displaying a user profile, rendering a transaction history, and handling a settings form), split it.
- **Monolith Decomposition**: Avoid files containing hundreds of lines of UI. Extract distinct sub-sections into sibling components or sub-components (e.g., `<ProfileHeader>`, `<ProfileDetails>`, `<SettingsForm>`).
- **Limit File Size**: Aim to keep React component files under 150 lines. If a file grows larger, proactively look for sub-components to extract.

### 3. Descriptive & Self-Documenting Naming
- **Booleans**: Prefix boolean variables and state with auxiliary verbs (e.g., `isLoading`, `hasError`, `isSubmitDisabled`, `isOpen`).
- **Event Handlers**: Use `handle` prefix for functions that handle events (e.g., `handleSubmit`, `handleCancel`) and pass them as `on` prefixed props (e.g., `onSubmit`, `onClose`).
- **Avoid Abbreviations**: Do not abbreviate variable names (e.g., use `transaction` instead of `tx`, `user` instead of `u`, `amount` instead of `amt`).

### 4. Prop Types and Strict Interfaces
- Define explicit TypeScript `interface` or `type` for all component props.
- Avoid using `any`.
- Keep props minimal. If a component requires too many props, it may be doing too much or can be simplified.
- Pass domain entities (e.g., `user: User`) instead of passing primitive properties one by one, unless the component is highly reusable/generic.

### 5. Conditional Rendering & Helpers
- Avoid deeply nested conditional (ternary) operators inside JSX.
- If a section of JSX has complex conditional rendering logic, extract it into a helper function (e.g., `renderStatus()`) or a separate sub-component (e.g., `<StatusDisplay>`).
- Keep JSX clean, readable, and declarative.

### 6. Constants Organization & Scope
- Replace hard-coded strings, magic numbers, or configuration arrays with named constants.
- Determine constant placement based on its usage scope:
  - **Global Scope**: If a constant is shared across multiple modules/pages (like API base paths, app-wide configs, or global themes), place it in `src/constants/` (e.g., `src/constants/config.ts`).
  - **Feature Scope**: If a constant is shared only between components/hooks of a specific feature folder (e.g. options shared within `src/components/transfer/`), isolate it in a dedicated constants file inside that feature directory (e.g., `src/components/transfer/transfer.constants.ts`).
  - **Local Scope**: If a constant is strictly local to a single React component or hook (e.g., local lists or specific options arrays), define it directly at the top of the file using UPPER_SNAKE_CASE.

