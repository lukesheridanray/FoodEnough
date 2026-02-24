# Change Report: Goal Weight + Weight Projection Visual

**Date:** 2026-02-24
**Feature:** Goal weight field with projection chart on profile/weight tracker page

---

## Executive Summary

Added a `goal_weight_lbs` field to the user model and profile endpoints, a goal weight input UI in the WeightTracker component, and a projection chart that shows the user's projected weight trajectory toward their goal based on their current trend.

---

## Files Changed

### Backend/main.py
| Change | Details |
|--------|---------|
| **User model** (line ~99) | Added `goal_weight_lbs = Column(Float, nullable=True)` |
| **ProfileUpdate schema** (line ~1653) | Added `goal_weight_lbs: Optional[float] = None` with validator (50-700 lbs) |
| **GET /profile** (line ~2680) | Added `goal_weight_lbs` to response dict |
| **PUT /profile** (line ~2717) | Added `goal_weight_lbs` save logic |
| **PUT /profile response** (line ~2734) | Added `goal_weight_lbs` to response dict |
| **GET /analytics/projections** (line ~4761) | Extended with goal-aware projections: `goal_weight_lbs`, `weeks_to_goal`, `moving_toward_goal`, `extended_projections` (weekly points up to goal or 52 weeks), `calorie_deficit` |

### Frontend/app/hooks/useProfile.ts
| Change | Details |
|--------|---------|
| **Profile interface** | Added `goal_weight_lbs?: number \| null` |
| **State variables** | Added `goalWeight`, `savingGoalWeight`, `goalWeightError`, `goalWeightSuccess` |
| **loadProfile** | Loads `goal_weight_lbs` into `goalWeight` state |
| **handleSaveGoalWeight** | New function: saves goal weight via PUT /profile with unit conversion |
| **Return exports** | Added all goal weight state and handlers |

### Frontend/app/components/WeightTracker.tsx
| Change | Details |
|--------|---------|
| **Props** | Added: `goalWeight`, `setGoalWeight`, `savingGoalWeight`, `goalWeightError`, `goalWeightSuccess`, `onSaveGoalWeight`, `isPremium`, `profileGoalWeight` |
| **Imports** | Added `useState`, `useEffect`, `ReferenceLine`, `apiFetch`, `UnauthorizedError` |
| **Goal Weight section** | Inline input to set/edit goal weight with purple accent styling |
| **Projection chart** | LineChart with solid green historical line, dashed purple projected line, dashed red goal reference line |
| **Summary text** | Shows "reach X lbs in ~N weeks" or "moving away from goal" warning |
| **Empty states** | "Log weight for 2+ weeks" / "Set a goal weight" / loading spinner |

### Frontend/app/profile/page.tsx
| Change | Details |
|--------|---------|
| **WeightTracker props** | Passed all new goal weight props from useProfile hook |

---

## Verification Steps

1. `python -m py_compile Backend/main.py` - PASSED
2. `npx tsc --noEmit` - PASSED
3. `npm run build` - PASSED

---

## User-Facing Behavior

1. **Goal Weight Input** - Below "Log Weight" form, users see a "Goal Weight" card. Click "Set" to save, "Edit" to change.
2. **Projection Chart** (Premium users with 2+ weight entries + goal weight) - Shows historical weight (green line) + projected trajectory (purple dashed) + goal line (red dashed).
3. **Summary text** - "At your current rate (-X lbs/wk), you'll reach Y lbs in ~N weeks" or amber warning if moving away from goal.
4. **Empty states** - Informative messages for insufficient data or missing goal weight.
