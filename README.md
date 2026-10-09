# choice. — Account-Free Real-Time Polling

> Simple · Fresh · Clean real-time polling website. No accounts, fast voting, private public results.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Overview

**Choice** makes creating a poll, casting a vote, and understanding results feel effortless. Built desktop-first as a responsive web product without native mobile bloat, Choice combines clean minimalism with powerful features: choice capacity limits, total vote caps, auto-closing countdowns, real-time live streaming via Server-Sent Events (SSE), and owner-only management tools.

---

## Key Features

### 1. Fast, Account-Free Poll Creation (`/`)
- **Question & Choices**: 300-character counter, dynamic row management (supports 2 to 25 choices) with explicit boundary feedback.
- **Progressive Disclosure Rules**:
  - **Multiple Choices**: Allow voters to select multiple options.
  - **Choice Capacity Limits**: Set maximum voters per choice (1 to 10) with an interactive Windows 11-inspired capacity slider. Full choices automatically disable.
  - **Total Vote Limits**: Auto-close polls after preset submissions (10, 25, 50, 100, 150, 200).
  - **Voting Time Limits**: Auto-close polls after preset durations (1h, 2h, 4h, 8h, 12h, 24h).
- **Share Modal**: Generates clean voter links immediately, while keeping secret owner links private.

### 2. Streamlined Voting Experience (`/poll/[id]`)
- **Focused Layout**: 640–680px readable content column.
- **Accessible Option Cards**: Full-surface cards wrapping native radio and checkbox inputs for complete keyboard arrow-key navigation (WCAG 2.2 AA).
- **Voter Privacy**: Explicit disclaimer ensuring voter names are visible only to the poll creator, never to other voters.
- **Dedicated Confirmation**: Prevents accidental double submissions with immediate save feedback.

### 3. Real-Time Live Results (`/poll/[id]/results`)
- **SSE Live Streaming**: Real-time push updates without periodic polling overhead. Includes live connection status (Live / Reconnecting / Updates paused).
- **Three KPI Cards**: Total voters / votes, Leading choice (with crown badge and tie handling), and Poll status.
- **Horizontal Bar Visualization**:
  - Stable choice ordering during live updates with optional "Most votes" sort toggle.
  - Accurate metric denominators (`% of voters` vs `% of votes`).
  - Zero-votes empty track display.

### 4. Owner Dashboard & Choice-Based CSV Export
- **3-Tab Management Panel**: Overview, Responses log (voter names, selected options, timestamps), and Share & Export.
- **Choice-Based CSV Export**:
  - Organized strictly by choice: `Selected Choice`, `Voters (Names)`, `Total Votes`.
  - One row per choice in original order, comma-separating all voter names who picked each option.
  - Full support for multi-choice and zero-vote options.
  - **Security (CWE-1236)**: Formula injection defense sanitizing cells and individual voter names starting with `=`, `+`, `-`, `@`, `\t`, `\r`, or `\n`.
  - **Compatibility**: Encoded with UTF-8 BOM (`\uFEFF`) and RFC 4180 quote escaping for Excel and Google Sheets.
  - **Access Control**: Protected by `adminKey` (`HTTP 403` for non-owners).

### 5. Choice Design System v1.0
- **Tokens & Themes**: Complete light (`#F8FAFC`) and dark (`#0B1220`) theme palettes, indigo primary accents (`#4F46E5`), cyan capacity highlights (`#0891B2`), and semantic alert states.
- **Typography & Rhythm**: Font stack prioritizing Geist Sans / Inter / Geist Mono, strict 4px/8px layout grid, and `prefers-reduced-motion` compliance.
- **Reusable Component Library**: Built with dedicated, accessible components (`TextInput`, `Textarea`, `InlineAlert`, `EmptyState`, `Skeleton`, `PageHeading`, `Toast`, `ThemeToggle`).

---

## Tech Stack

- **Framework**: [Next.js 16.4](https://nextjs.org/) (App Router, Turbopack)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Streaming**: Server-Sent Events (SSE)
- **Deployment**: [Render](https://render.com/) (`render.yaml`)

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/hinda99/choice-poll.git
cd choice-poll
npm install
```

### Running Locally

```bash
# Start development server
npm run dev

# Or build and run production server
npm run build
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## Testing & Verification

Choice includes automated test suites covering concurrency, security, and edge cases:

```bash
# Run linting
npm run lint

# Run TypeScript typecheck
npx tsc --noEmit

# Run Next.js production build
npm run build

# Run Choice-based CSV Export test suite (97 checks)
node scripts/test-csv-export.mjs

# Run full security and concurrency audit (38 checks)
node scripts/test-full-audit.mjs

# Run API CRUD & elimination mode test suite
node scripts/test-api.mjs

# Run choice capacity limit test suite
node scripts/test-capacity.mjs

# Run new features & quota test suite
node scripts/test-new-features.mjs

# Run 25-choices boundary and 200-votes quota test suite
node scripts/test-25-choices-200-votes.mjs
```

---

## Deployment

This repository is configured for automatic deployment on [Render](https://render.com/) using [`render.yaml`](render.yaml):

```yaml
services:
  - type: web
    name: choice-poll
    runtime: node
    plan: free
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: 20
```

Pushing to the `main` branch automatically triggers a production build and deploy on Render.

---

## License

MIT License.
