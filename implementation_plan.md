# UI Performance & Lag Optimization Plan

Improve AXINITE OS responsiveness and eliminate rendering jank/lag during state updates (such as focus timer ticks or task completions) by optimizing component re-rendering behaviors and CSS compositing.

## User Review Required

> [!IMPORTANT]
> - These are performance-only changes. No features, styles, or behaviors are added or altered.
> - All components remain visually identical. The changes only prevent redundant render cycles.

---

## Proposed Changes

### CSS Stylesheet

#### [MODIFY] [globals.css](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/styles/globals.css)
- Change `contain: strict;` to `contain: content;` on scroll containers.
- This ensures elements optimize repaints/relayouts safely without size-collapse bugs.

### Dashboard Page

#### [MODIFY] [Dashboard.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/pages/Dashboard.jsx)
- Memoize arrays (`weekHours`, `pending`, `focusTasks`, `upcoming`, `subList`) so they preserve references between renders.
- Wrap `ActivityBars`, `TaskRow`, `AIBriefing`, and `RingProgress` in `memo` to avoid re-rendering them unless their props change.

### Notes Page

#### [MODIFY] [Notes.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/pages/Notes.jsx)
- Wrap `NoteCard` in `memo`.
- Cache `onOpen` and `onDelete` handlers in `Notes` component using `useCallback` to prevent breaking `NoteCard`'s memoization.

### Pipeline Page (Tasks)

#### [MODIFY] [Tasks.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/pages/Tasks.jsx)
- Wrap `TaskCard` in `memo`.
- Cache task interaction handlers (`onComplete`, `onRestore`, `onEdit`, `onDelete`) in the main component using `useCallback`.

### Progress Page

#### [MODIFY] [Progress.jsx](file:///c:/Users/Lenovo/Downloads/learner-os-FINAL-v4/src/pages/Progress.jsx)
- Memoize data arrays (`weekData`, `subList`, `reportData`).
- Wrap `Ring`, `PillBars`, and `AuraIntelligencePanel` in `memo`.
- Memoize local calculations inside `AuraIntelligencePanel` (`pendingCount`, `completedCount`, `overdueCount`, `sortedSubs`, `strongSubs`, `weakSubs`).

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify the application bundles and builds without syntax or type errors.

### Manual Verification
- Deploy to localhost and interact with the application.
- Toggle task completion, update notes, and verify that the UI renders smoothly without lags.
- Check that the scroll containers are correctly sized (no 0px height collapse).
