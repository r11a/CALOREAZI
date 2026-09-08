import { mealScorePresentation } from "../../server/nutrition.js";
import { AppIcon } from "./AppIcon";

export function MealScoreBadge({ meal }: { meal: Parameters<typeof mealScorePresentation>[0] }) {
  const rating = mealScorePresentation(meal);
  if (!rating) return null;
  return <span className={"meal-score-badge meal-score-" + rating.tone}
    aria-label={"ציון הארוחה: " + rating.score + " מתוך 100"}
    title="ציון הארוחה לפי החישוב הקיים: חלבון, קלוריות, הרכב וביטחון הנתונים">
    <span className="meal-score-icon" aria-hidden="true"><AppIcon name="star" /></span>
    <span className="meal-score-label">ציון הארוחה</span>
    <span className="meal-score-number" dir="ltr">{rating.score}<span>/100</span></span>
  </span>;
}
