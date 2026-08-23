function firstName(value) {
  return String(value || "").trim().split(/\s+/)[0] || "שלום";
}

function variantIndex(seed, length) {
  const hash = [...String(seed || Date.now())].reduce((sum, character) => ((sum * 31) + character.charCodeAt(0)) >>> 0, 7);
  return hash % length;
}

const copy = {
  "morning-brief": [
    ["הבוקר שלך", ({ name, recap, target }) => `בוקר טוב ${name}. ${recap} היום מכוונים ל־${target} קלוריות.`],
    ["מתחילים יום חדש", ({ name, recap, target }) => `${name}, ${recap} היעד להיום: ${target} קלוריות.`],
    ["מבט קצר להיום", ({ name, recap, target }) => `בוקר טוב ${name}. ${recap} היום מתחילים מחדש עם יעד של ${target} קלוריות.`],
  ],
  "meal-breakfast": [["ארוחת בוקר", ({ name }) => `${name}, אכלת הבוקר? עדכון קצר ישמור את היום מדויק.`], ["עדכון בוקר", ({ name }) => `${name}, עוד לא נרשמה ארוחת בוקר. אפשר לעדכן בכמה שניות.`]],
  "meal-lunch": [["ארוחת צהריים", ({ name }) => `${name}, אכלת צהריים? כדאי לעדכן עכשיו.`], ["עדכון צהריים", ({ name }) => `${name}, ארוחת הצהריים עדיין לא נרשמה.`]],
  "meal-dinner": [["ארוחת ערב", ({ name }) => `${name}, אם אכלת ערב זה זמן טוב לעדכן.`], ["סוגרים את היום", ({ name }) => `${name}, ארוחת הערב עדיין לא נרשמה.`]],
  water: [["זמן לשתות", ({ name, current, target }) => `${name}, נרשמו ${current} מתוך ${target} מ״ל מים.`], ["תזכורת מים", ({ name, current }) => `${name}, עד עכשיו נרשמו ${current} מ״ל. אולי הגיע הזמן לכוס מים.`]],
  coach: [["המלצה אישית", ({ name, advice }) => `${name}, ${advice}`], ["טיפ מהמאמן", ({ name, advice }) => `${name}, ${advice}`]],
  insight: [["תובנת היום", ({ name, insight }) => `${name}, ${insight}`], ["מבט על היום", ({ name, insight }) => `${name}, ${insight}`]],
  summary: [["סיכום היום", ({ name, score, calories, target }) => `${name}, הציון היום ${score}/100. נצרכו ${calories} מתוך ${target} קלוריות.`], ["היום במספרים", ({ name, score, calories }) => `${name}, סיימת עם ציון ${score}/100 ו־${calories} קלוריות.`]],
  weekly: [["המגמה השבועית", ({ name, average }) => `${name}, הממוצע השבועי הוא ${average} קלוריות ביום.`], ["השבוע שלך", ({ name, average }) => `${name}, השבוע נרשמו בממוצע ${average} קלוריות ביום.`]],
  weight: [["תזכורת שקילה", ({ name }) => `${name}, עברו יותר משבועיים מהמדידה האחרונה.`], ["עדכון משקל", ({ name }) => `${name}, מדידה חדשה תעזור לדייק את המגמה.`]],
  achievement: [["יום מאוזן", ({ name, score }) => `${name}, הגעת לציון ${score}. עקביות קטנה עושה הבדל.`], ["התקדמות יפה", ({ name, score }) => `${name}, ציון ${score} היום — הישג רגוע ומשמעותי.`]],
};

export function buildNotificationCopy(type, userName, context = {}, seed = "") {
  const variants = copy[type] || [["עדכון אישי", ({ name }) => `${name}, יש לך עדכון חדש.`]];
  const [title, body] = variants[variantIndex(`${seed}:${type}`, variants.length)];
  const values = { name: firstName(userName), ...context };
  return { title, body: body(values) };
}

export const notificationTestContexts = {
  "morning-brief": { recap: "אתמול נרשם ציון 82/100.", target: 1950 },
  "meal-breakfast": {}, "meal-lunch": {}, "meal-dinner": {},
  water: { current: 750, target: 2000 },
  coach: { advice: "בארוחה הבאה כדאי לשלב מקור חלבון." },
  insight: { insight: "נותרו כ־420 קלוריות במסגרת היעד היומי." },
  summary: { score: 82, calories: 1730, target: 1950 },
  weekly: { average: 1840 }, weight: {}, achievement: { score: 86 },
};
