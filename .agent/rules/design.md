---
description: 'rules for visual aesthetics, component styling, and CSS token usage'
dateModified: 2026-02-23
---

# The Gogam Standard: Visual Design & Tokenization

**Objective**: Prevent visual fragmentation, "Digital Kudzu", and "wild shit" in UI components. Every stylistic decision must be derived from a controlled set of variables.

---

## 1. The Single Source of Truth for Styles
All design variables must reside in `assets/styles/tokens.css`.
Components are forbidden from defining arbitrary stylistic values.

*   **FORBIDDEN**: Hardcoded hex codes (e.g., `#ff0000`).
*   **FORBIDDEN**: Hardcoded pixel/rem measurements for layouts, margins, or paddings (e.g., `margin: 15px`, `padding: 2rem`).
*   **FORBIDDEN**: Hardcoded transition durations or timing functions (e.g., `transition: all 0.2s ease`).
*   **FORBIDDEN**: Arbitrary opacity values (e.g., `opacity: 0.8`).
*   **FORBIDDEN**: Arbitrary font sizes and weights (e.g., `font-size: 1.1rem`, `font-weight: 500`).

## 2. Using Semantic Tokens
You must use the CSS custom properties defined in `tokens.css` for all stylistic needs.

### 2.1 Spacing
Use spacing tokens for `margin`, `padding`, `gap`, etc.
*   `--space-xs` (0.25rem / 4px)
*   `--space-sm` (0.5rem / 8px)
*   `--space-md` (1rem / 16px)
*   `--space-lg` (1.5rem / 24px)
*   `--space-xl` (2rem / 32px)
*   `--space-2xl` (3rem / 48px)

### 2.2 Typography
Use typography scale tokens and semantic headers.
*   **Scale**: `--size-1` to `--size-6`
*   **Semantic**: `--h1-font-size`, `--h2-font-size`, etc.
*   **Weights**: `--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`.

### 2.3 Interactive States (Hover/Focus)
Standardize interactive behaviors. Do not invent new hover states for individual components.
*   **Opacity**: Use `--opacity-hover` (typically `0.8`) or `--opacity-disabled` (typically `0.5`).
*   **Transitions**: Use predefined transitions like `--transition-fast` (e.g., `var(--transition-fast) opacity`) or `--transition-normal`.
*   **Colors**: Hover effects should leverage `--color-accent` or an opacity change, never a random new color.

## 3. Creating New Components
When building a new component (`components/atoms/`, `components/molecules/`):
1.  Check if existing tokens cover the required styling.
2.  If an entirely new _category_ of styling is required, add it to `tokens.css` as a structural variable (e.g., `--radius-xl`) BEFORE using it in the component.
3.  Keep `.client.vue` enhanced interactions strictly cleanly separated from the base component.

## Summary
If a component does not explicitly use `var(--something)`, it is likely violating the design system. Review and refactor.
