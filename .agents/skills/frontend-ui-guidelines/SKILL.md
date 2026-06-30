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
- **Clean Code & SRP**: Follow the Single Responsibility Principle. Ensure custom hooks handle logic and components only render UI. Use descriptive, self-documenting naming conventions.
- **Atomic Modular Architecture**: Decompose UIs into Atoms, Molecules, and Organisms. Avoid monolith UI files by extracting reusable components (e.g., `<AuthCard>`, `<TransactionTable>`).
- **Responsiveness**: Ensure the UI is fluid, premium-looking, and fully compatible with desktop screens. Use CSS Flexbox/Grid or Antd Grid (`Row`/`Col`). Avoid fixed container widths that break ultra-wide desktop views.
- **Aesthetics (Banking App Style)**:
  - **Typography**: Strictly use **Inter** for all UI elements. Use medium/semibold weights for labels and bold/extrabold for prominent financial numbers.
  - **Borders & Shapes**: Rely on shadows rather than hard borders to separate cards. Use `borderRadius: 8px` for inner elements and `12px` to `16px` for outer cards/modals.
- **Monetary Values**: Always format as VND: `new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(amount)`. Use larger font sizes and high-contrast text for balances.
- **States & Feedback**: Always handle `loading`, `error`, and `success`. Disable action buttons during pending states. Use Antd's `message` or `notification` for feedback.
- **Forms and Validation**: By default, limit noisy validations. Use `validateTrigger="onSubmit"` on `<Form>` components so that error messages only appear after the user attempts to submit the form, rather than while they are typing.

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

## Table Design (Stripe-style)

### Alignment
- Left-align all textual content (Name, Description, Category).
- Right-align all numeric values, monetary amounts, percentages, exchange rates, and dates.
- Center or right-align status badges and action buttons.
- Headers must always match the alignment of their corresponding data cells.
- Maintain consistent alignment across all pages using the same table structure.

### Typography
- Use medium-weight headers (500–600).
- Use regular-weight body text (400).
- Enable `font-variant-numeric: tabular-nums` for all numeric columns to improve readability and comparison.
- Maintain comfortable line height (1.5–1.6).
- Use clear visual hierarchy:
  - Primary text: darker color.
  - Secondary text (email, description, metadata): lighter color and slightly smaller font.
- Avoid excessive font weight variation.

### Spacing
- Use generous padding:
  - Horizontal: 16–20px.
  - Vertical: 14–18px.
- Keep row height consistent (approximately 56–64px).
- Avoid cramped columns.
- Provide sufficient spacing between columns.
- Truncate excessively long text using ellipsis while preserving layout.
- Never allow numeric values to wrap.

### Borders & Background
- Avoid vertical grid lines.
- Use only subtle horizontal dividers (#E3E8EE or Ant Design default border).
- Table header should have a subtle background (#F8FAFC or equivalent).
- Apply a soft row hover background (#F8FAFC or equivalent).
- Keep borders lightweight and unobtrusive.

### Colors
- Maintain a clear visual hierarchy:
  - Primary text: strong neutral.
  - Secondary text: muted neutral.
  - Borders: subtle gray.
  - Hover: very light gray.
- Avoid overly saturated colors except for semantic states (success, warning, error).
- Use consistent semantic colors throughout the table.

### Status Badges
- Use compact pill-shaped badges.
- Keep badge size, padding, and border radius consistent.
- Use subtle background colors instead of solid fills.
- Reserve semantic colors:
  - Green → Success / Active
  - Yellow → Pending
  - Red → Error / Locked
  - Gray → Inactive / Disabled

### Action Column
- Keep the action column compact.
- Right-align action buttons or links.
- Maintain consistent spacing between icons and text (6–8px).
- Use text buttons or icon buttons instead of large filled buttons whenever possible.
- Disabled actions should remain visible but clearly muted.

### Numeric Columns
- Always right-align.
- Use tabular numbers.
- Keep decimal precision consistent.
- Format currency consistently across all rows.
- Ensure values align vertically for easy comparison.

### Empty & Loading States
- Display a clean empty state instead of an empty table.
- Preserve table structure while loading using skeleton placeholders.
- Avoid layout shifts between loading and loaded states.

### Responsive
- Preserve column alignment on all screen sizes.
- Allow horizontal scrolling instead of compressing columns.
- Do not wrap numeric values.
- Keep important columns (Name, Amount, Status, Action) visible whenever possible.
- Hide lower-priority columns only when necessary.

### Accessibility
- Maintain sufficient color contrast.
- Ensure hover is not the only interaction feedback.
- Keep click targets at least 32–40px high.
- Preserve keyboard navigation and focus states.

### Visual Polish (Stripe-style)
- Use generous whitespace instead of heavy borders.
- Prefer subtle shadows and soft separators over strong outlines.
- Keep border radius consistent across tables, badges, and controls.
- Align text baselines across rows.
- Maintain a clean, calm, and premium appearance with minimal visual noise.