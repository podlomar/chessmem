# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chess Square Trainer — a browser-based quiz app that trains players to identify chess square colors (light/dark). TypeScript + Webpack.

## Commands

- `npm run dev` — start webpack dev server with HMR
- `npm run build` — production build to `dist/`

## Architecture

Single-page app, all source in `src/`:

- **src/app.ts** — all game logic in a single module:
  - **Levels system** (`LEVELS` array, `getActiveSquares()`) — progressive difficulty via square subsets
  - **State machine** — three states: `idle`, `playing`, `done` (`GameState` type); transitions via `showIdle()`, `showPlaying()`, `showDone()`
  - **Game loop** — `startSession()` → `nextRound()` → `answer()` cycle, 20 questions per round (`ROUND_COUNT`)
  - **Input** — keyboard (arrow keys), click, and gamepad polling (8BitDo Zero 2 button mapping)
  - **Voice feedback** — Web Speech API (`speechSynthesis`) announces squares and results
- **src/index.html** — template for HtmlWebpackPlugin (no `<script>` or `<link>` tags — webpack injects them)
- **src/style.css** — dark theme, chess-colored buttons (#f0d9b5 light / #b58863 dark), imported from app.ts

## Key Logic

Square color determination: `(fileIndex + rank) % 2 === 0` → dark, else light (1-indexed file). See `getSquareColor()`.

## Commit Convention

Uses conventional commits with emoji prefixes (e.g., `✨ feat:`, `🐛 fix:`). See `.claude/commands/commit.md` for full reference.
