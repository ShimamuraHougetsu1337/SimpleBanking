---
name: frontend-ui-guidelines
description: >
  Global layout guidelines and overall color palette for the Simple Banking App frontend (Stripe-inspired design).
  Triggers exclusively when: working on frontend development, UI creation, styling,
  components, layouts, React UI, or designing the web application's aesthetics.
---

# Skill: Frontend UI Guidelines & Color Palette (Stripe Aesthetic)

## When to Use This Skill

Use this skill when developing frontend UI components, managing layouts, styling, or creating new views in the React application. It outlines the global layout rules and the standard color palette to ensure a highly polished, premium financial UI inspired by Stripe.

## UI Framework and Foundations

- **Library**: Use **Ant Design (antd v5)** exclusively. Override default Antd tokens using `ConfigProvider` to soften borders and adjust shadows.
- **No Deprecated APIs**: Do NOT use deprecated Ant Design v5 APIs (for example: do NOT use `Select.Option` or `const { Option } = Select` keys). Always use the modern equivalent props (such as passing the `options={[]}` array prop directly to the `<Select>` component).
- **Clean Code & SRP**: Follow the guidelines in `.agents/skills/clean-react-components/SKILL.md` to separate presentation logic into custom hooks and keep components focused.
- **Atomic Modular Architecture**: Decompose UIs into Atoms, Molecules, and Organisms. Avoid monolith UI files by extracting reusable components (e.g., `<AuthCard>`, `<TransactionTable>`).
- **Responsiveness**: Ensure the UI is fluid, premium-looking, and fully compatible with desktop screens. Use CSS Flexbox/Grid or Antd Grid (`Row`/`Col`). Avoid fixed container widths that break ultra-wide desktop views.
- **Aesthetics (Banking App Style)**:
  - **Typography**: Strictly use **Inter** for all UI elements. Use medium/semibold weights for labels and bold/extrabold for prominent financial numbers.
  - **Borders & Shapes**: Rely on shadows rather than hard borders to separate cards. Use `borderRadius: 8px` for inner elements and `12px` to `16px` for outer cards/modals.
- **Monetary Values**: Always format as VND: `new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(amount)`. Use larger font sizes and high-contrast text for balances.
- **States & Feedback**: Always handle `loading`, `error`, and `success`. Disable action buttons during pending states. Use Antd's `message` or `notification` for feedback. Always provide empty and error views for tables.
- **Forms and Validation**: Use Ant Design's `<Form>` and `<Form.Item>` for all forms — do not use `react-hook-form`. Limit noisy validations by using `validateTrigger="onSubmit"`.
- **Data Display**: Implement lists using the Ant Design `<Table>` component with server-side pagination. Display balances and monetary counters using the Ant Design `<Statistic>` component.

## Global Layout Guidelines

1. **App Shell**: Clean, airy layout. Top Navigation should be borderless with subtle glassmorphism if sticky.
2. **Container Spacing**: Generous whitespace.
   - Standard padding: `24px` to `32px` on desktop, `16px` on mobile.
   - Use `<Space>` or Flexbox with gaps (`8px`, `16px`, `24px`) instead of margins.
3. **Card-Based Layouts**: Cards must use pure white backgrounds floating on the app's soft gray background.
4. **Tables**: Stripe-style tables are borderless, with generous padding, highlighting rows on hover rather than showing strict grid lines.

## Overall Color Palette (Standard Banking App)

Apply these exact values via CSS variables or Ant Design `ConfigProvider` tokens.

### Primary Colors (Brand)
- **Primary / Brand Blue**: `#3B82F6` (Blue 500 - same as DashboardPage)
- **Primary Hover**: `#2563EB` (Blue 600)
- **Primary Active**: `#1D4ED8` (Blue 700)

### Backgrounds and Surfaces
- **App Background (Light Mode)**: `#F8FAFC` (Slate 50).
- **Card / Surface Background**: `#FFFFFF` (Pure white).

### Typography (Text Colors)
- **Heading / Primary Text**: `#1e293b` (Slate 800).
- **Secondary Text / Descriptions**: `#64748b` (Slate 500).
- **Disabled / Placeholder Text**: `#94a3b8` (Slate 400).

### Semantic and Feedback Colors
- **Success**: `#10B981` (Emerald 500).
- **Warning**: `#F59E0B` (Amber 500).
- **Error / Danger**: `#EF4444` (Red 500).

## Micro-Animations and Elevation (Shadows)

- **Stripe-like Shadows**: Replace Antd's default shadows with layered CSS box-shadows. 
  - *Standard Card*: `box-shadow: 0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3);`
  - *Hover/Elevated*: `box-shadow: 0 6px 12px -2px rgba(50, 50, 93, 0.25), 0 3px 7px -3px rgba(0, 0, 0, 0.3);`
- **Hover States**: Interactive cards/buttons should translate `transform: translateY(-1px)` or `-2px` with a transition of `all 0.15s ease`.