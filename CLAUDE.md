# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chess Square Trainer — a browser-based quiz app that trains players to identify chess square colors (light/dark). No build step, no bundler, no framework — plain HTML + CSS + JS served directly.

## Running

Open `index.html` in a browser. No server or build process required.

## Architecture

Single-page app with three files:

- **index.html** — static markup: square display, light/dark answer buttons, stats, level selector, gamepad status
- **app.js** — all game logic in a single script, no modules:
  - **Levels system** (`LEVELS` array, `getActiveSquares()`) — progressive difficulty via square subsets
  - **State machine** — three states: `idle`, `playing`, `done`; transitions via `showIdle()`, `showPlaying()`, `showDone()`
  - **Game loop** — `startSession()` → `nextRound()` → `answer()` cycle, 20 questions per round (`ROUND_COUNT`)
  - **Input** — keyboard (arrow keys), click, and gamepad polling (8BitDo Zero 2 button mapping)
  - **Voice feedback** — Web Speech API (`speechSynthesis`) announces squares and results
- **style.css** — dark theme, chess-colored buttons (#f0d9b5 light / #b58863 dark)

## Key Logic

Square color determination: `(fileIndex + rank) % 2 === 0` → dark, else light (1-indexed file). See `getSquareColor()`.

## Commit Convention

Uses conventional commits with emoji prefixes (e.g., `✨ feat:`, `🐛 fix:`). See `.claude/commands/commit.md` for full reference.
