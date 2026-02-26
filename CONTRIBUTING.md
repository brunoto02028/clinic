# Contributing to BPR Clinical System

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install --legacy-peer-deps`
3. Copy `.env.example` to `.env` and configure your environment
4. Run `npx prisma generate` and `npx prisma db push`
5. Start the dev server: `npm run dev`

## Code Style

- **TypeScript** is required for all new files
- **Tailwind CSS** for styling — use semantic tokens (`text-foreground`, `bg-card`, `text-muted-foreground`) for theme compatibility
- **shadcn/ui** components for UI elements
- Follow existing patterns in the codebase

## Dark Theme Guidelines

All UI must be dark-theme compatible. **Do NOT use:**
- `bg-white`, `bg-gray-50`, `bg-slate-50`, `bg-[color]-50`
- `text-slate-800`, `text-gray-700`, or any dark text on dark backgrounds
- `from-white`, `to-white`, `via-white` in gradients
- `border-[color]-200` (use `/20` opacity instead)

**Use instead:**
- `bg-card`, `bg-muted`, `bg-muted/50` for backgrounds
- `text-foreground`, `text-muted-foreground` for text
- `bg-[color]-500/10`, `border-[color]-500/20`, `text-[color]-400` for semantic colors

## Branch Naming

- `feature/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation changes

## Commit Messages

Use conventional commits:
```
feat: add new patient export feature
fix: resolve dark theme contrast issue in screening form
docs: update API reference for foot scans
```

## Pull Request Process

1. Ensure TypeScript compiles without errors: `npx tsc --noEmit`
2. Test the feature in both English and Portuguese
3. Verify dark theme compatibility across all modified pages
4. Update CHANGELOG.md if applicable
5. Submit PR with a clear description of changes

## Internationalization (i18n)

- All user-facing strings must use the `T()` helper from `lib/i18n.ts`
- Add translations for both `en-GB` and `pt-BR` locales
- Key format: `section.subsection.key` (e.g., `screening.redFlagsIdentified`)

## API Routes

- Patient routes: `/api/patient/*` — Use `getEffectiveUser()` for auth
- Admin routes: `/api/admin/*` — Use permission checks from `lib/api-permissions.ts`
- All routes must handle errors gracefully and return proper HTTP status codes

## Questions?

Open an issue or contact the development team.
