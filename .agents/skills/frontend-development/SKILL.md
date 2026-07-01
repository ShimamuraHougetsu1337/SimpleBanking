---
name: frontend-development
description: >
  Dispatcher for React frontend development, UI guidelines, API layer, and components.
  Trigger when: working on frontend development, React components, hooks, styling,
  tables, layout, API integration, or reviewing frontend code quality.
---

# Skill: Frontend Development Dispatcher

You are working on the React frontend of the Simple Banking App. This skill acts as a central dispatcher for frontend-related rules. 

Before making changes, you **MUST** use the `view_file` tool to read the specific reference documents below that match your current task:

- **General React Conventions**: `.agents/skills/frontend-development/references/frontend-react.md`
  *(Read when writing or modifying general React application logic)*
- **Clean React Components (SRP)**: `.agents/skills/frontend-development/references/clean-react-components.md`
  *(Read when refactoring components, writing hooks, or ensuring separation of concerns)*
- **Frontend UI & Styling Guidelines**: `.agents/skills/frontend-development/references/frontend-ui-guidelines.md`
  *(Read when building UIs, adjusting layouts, styling, or using Ant Design)*
- **Stripe-Style Table Design**: `.agents/skills/frontend-development/references/stripe-table-design.md`
  *(Read when creating or modifying data tables, lists, or transaction histories)*
- **React API Layer (Axios + React Query)**: `.agents/skills/frontend-development/references/react-api-layer.md`
  *(Read when integrating APIs, writing Axios interceptors, managing tokens, or using React Query)*

## Priority Rules
1. **Separation of Concerns**: Keep components purely presentational. Extract logic into custom hooks.
2. **API Consistency**: All requests must go through the central Axios instance in `src/services/api.ts`.
3. **Premium UI**: Adhere strictly to the Stripe-inspired borderless, generous-padding design language.
