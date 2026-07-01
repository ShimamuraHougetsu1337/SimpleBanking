---
name: stripe-table-design
description: >
  Guidelines for designing highly polished, premium tables and data displays
  in the Stripe aesthetic (borderless layout, numeric alignment, accessibility).
  Triggers when: building or modifying tables, lists, data displays, or transaction history views.
---

# Skill: Stripe-Style Table Design Guidelines

## When to Use This Skill

Use this skill when designing or modifying tables, lists, and data displays in the React application. It ensures consistency, readability, and a premium financial UI feel.

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
