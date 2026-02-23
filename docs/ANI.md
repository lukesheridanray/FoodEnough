# Adaptive Nutrition Intelligence (ANI)

ANI is FoodEnough's premium feature that analyzes your food logs, weight trends, and workout adherence on a weekly cycle, then adjusts your calorie and macro targets with plain-English explanations for every change.

---

## How It Works

### The Weekly Cycle

1. **You log normally** — food, weight, and workouts for at least 7 days.
2. **You tap "Recalibrate Now"** on the ANI dashboard when the button becomes available.
3. **ANI analyzes the last 7 days** of your data and compares actual intake, weight change, and training consistency against your current goals.
4. **Your targets update** with a clear explanation of what changed and why.
5. **Insights surface** — patterns ANI detected in your data, like weekend protein dips or low workout adherence.

Recalibration is on-demand, not automatic. You control when it runs. A 7-day cooldown between recalibrations ensures enough data accumulates for meaningful analysis.

### Minimum Requirements

- At least 7 days since your first food log
- At least 5 of the last 7 days logged
- Nutrition goals configured (calories, protein, carbs, fat)

---

## The Algorithm

ANI uses deterministic, rule-based logic — no AI API calls, no black-box models. Every adjustment follows published nutritional science with conservative guardrails.

### Step 1: Aggregate Daily Averages

Food logs from the last 7 days are grouped by date. Daily totals for calories, protein, carbs, and fat are averaged across logged days.

### Step 2: Compute Weight Trend

The difference between the earliest and latest weight entry in the 7-day window gives the weekly weight delta. This is compared against expected rates for your goal type.

**Reference ranges** (from the American College of Sports Medicine and National Academy of Sports Medicine position stands):

| Goal | Healthy Weekly Rate |
|------|-------------------|
| Lose weight | -0.5 to -2.0 lbs/week (0.5–1% of body weight) |
| Gain weight | +0.25 to +1.0 lbs/week |
| Maintain | Less than 0.5 lbs change |

Sources:
- Garthe et al. (2011). *Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes.* International Journal of Sport Nutrition and Exercise Metabolism, 21(2), 97–104.
- Helms et al. (2014). *Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation.* Journal of the International Society of Sports Nutrition, 11(1), 20.

### Step 3: Compute Workout Adherence

Completed plan sessions divided by total planned sessions gives a training adherence percentage. This factors into calorie adjustments because actual energy expenditure may differ from planned activity levels.

### Step 4: Detect Patterns

ANI scans for recurring behaviors:

- **Weekend protein dip** — Weekend average protein falls below 75% of weekday average. Common in people who eat out more on weekends or skip meal prep.
- **Consistent under-eating** — Average calorie intake is below 80% of goal for 5+ days. Sustained large deficits risk metabolic adaptation and muscle loss.
- **Consistent over-eating** — Average calorie intake exceeds 115% of goal for 5+ days.

### Step 5: Apply Adjustment Rules

Each rule can modify calorie and protein targets independently. Multiple rules can fire in the same recalibration. All changes include a reasoning sentence.

| Condition | Adjustment | Rationale |
|-----------|-----------|-----------|
| Losing too fast (>3 lbs/week on a cut) | +5% calories | Rapid loss beyond 1% body weight/week increases lean mass loss. Slowing the rate preserves muscle. |
| Losing when you shouldn't (maintain/gain goal, >1 lb lost) | +7% calories | Unintended weight loss indicates an energy deficit that needs correcting. |
| Not gaining (gain goal, <0.25 lbs/week) | +5% calories | Insufficient surplus to support muscle growth. |
| Gaining too fast on maintenance (>1 lb gained) | -5% calories | Unintended surplus that will accumulate as fat over time. |
| Weekend protein dip detected | +5% protein target | Raising the target nudges weekend meal planning. Consistent protein distribution supports muscle protein synthesis throughout the week. |
| Low workout adherence (<50%) | -3% calories | Lower activity means lower energy expenditure. Adjusting intake prevents unintended surplus. |
| Consistent over-eating (non-lose goal) | Raise target halfway to actual, max +10% | If you're consistently above target without negative weight outcomes, the target may be unrealistically low. |
| On track | No change | Positive reinforcement message. |

**Scientific basis for adjustment magnitudes:**

- The 5–7% calorie adjustments correspond to roughly 100–175 kcal for a 2000–2500 kcal diet. This aligns with the principle of small, iterative changes recommended by the ISSN position stand on diets and body composition (Aragon et al., 2017).
- Protein adjustments of 5% are conservative. At a 150g target, this is ~8g — roughly one egg or small serving of Greek yogurt.

### Step 6: Enforce Safety Guardrails

- **10% cap**: No single recalibration can change any macro by more than 10% from its current value. This prevents large swings from a single unusual week.
- **1200 kcal floor**: Calorie targets never drop below 1200 kcal, consistent with minimum intake recommendations from the Academy of Nutrition and Dietetics for sustained dieting.

### Step 7: Recompute Macro Split

After calorie and protein adjustments:

1. **Fat** is set to 30% of total calories (divided by 9 cal/g), capped at 10% change from previous.
2. **Carbs** fill the remaining calories after protein and fat (divided by 4 cal/g), capped at 10% change from previous.

The 30% fat floor ensures adequate essential fatty acid intake and hormone production. This aligns with the Acceptable Macronutrient Distribution Range (AMDR) from the Dietary Reference Intakes, which recommends 20–35% of calories from fat for adults.

### Step 8: Generate Insights

Each detected pattern produces an insight card with a type (pattern, achievement, warning, or tip), a title, and a body explaining what was found. Logging consistency is also tracked — logging 6+ of 7 days earns an achievement insight.

---

## Base Goal Calculation

ANI adjustments overlay your base goals, which are calculated using the **Mifflin-St Jeor equation** — the most validated predictive equation for resting metabolic rate in healthy adults.

**BMR (Basal Metabolic Rate):**

- Male: `10 × weight(kg) + 6.25 × height(cm) - 5 × age - 5`
- Female: `10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161`

**TDEE (Total Daily Energy Expenditure):**

`BMR × Activity Multiplier`

| Activity Level | Multiplier |
|---------------|-----------|
| Sedentary (desk job, no exercise) | 1.2 |
| Light (1-3 days/week) | 1.375 |
| Moderate (3-5 days/week) | 1.55 |
| Active (6-7 days/week) | 1.725 |
| Very Active (hard exercise + physical job) | 1.9 |

**Goal adjustment from TDEE:**

- Lose: TDEE - 500 kcal (~0.5 kg/week deficit)
- Gain: TDEE + 300 kcal (lean bulk)
- Maintain: TDEE

**Protein:** 2.0 g per kg body weight — at the upper end of evidence-based recommendations (1.6–2.2 g/kg) from the ISSN position stand on protein and exercise (Jager et al., 2017).

Source:
- Mifflin et al. (1990). *A new predictive equation for resting energy expenditure in healthy individuals.* American Journal of Clinical Nutrition, 51(2), 241–247.
- Frankenfield et al. (2005). *Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review.* Journal of the American Dietetic Association, 105(5), 775–789.

---

## Key Design Decisions

**ANI targets overlay, never overwrite.** Your base goals (from the Mifflin-St Jeor calculation) are always preserved on your profile. ANI stores adjusted goals separately. If you disable ANI or your premium lapses, you revert to your base goals with no data loss.

**Recalibration is manual, not scheduled.** You decide when to recalibrate. This keeps you engaged with the process and avoids surprises from background changes to your targets.

**The engine is pure math.** No AI API calls, no latency, no cost per recalibration, and fully deterministic — the same inputs always produce the same outputs. This makes the system predictable, auditable, and fast.

**Conservative by default.** The 10% cap, 1200 kcal floor, and small adjustment percentages mean ANI nudges your targets gradually rather than making dramatic changes from a single week of data.

---

## References

1. Aragon, A.A. et al. (2017). International society of sports nutrition position stand: diets and body composition. *JISSN*, 14, 16.
2. Frankenfield, D. et al. (2005). Comparison of predictive equations for resting metabolic rate. *J Am Diet Assoc*, 105(5), 775–789.
3. Garthe, I. et al. (2011). Effect of two different weight-loss rates on body composition. *Int J Sport Nutr Exerc Metab*, 21(2), 97–104.
4. Helms, E.R. et al. (2014). Evidence-based recommendations for natural bodybuilding contest preparation. *JISSN*, 11(1), 20.
5. Jager, R. et al. (2017). International society of sports nutrition position stand: protein and exercise. *JISSN*, 14, 20.
6. Mifflin, M.D. et al. (1990). A new predictive equation for resting energy expenditure. *Am J Clin Nutr*, 51(2), 241–247.
7. Institute of Medicine. (2005). *Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids.* National Academies Press.
