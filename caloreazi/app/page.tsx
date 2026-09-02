"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks, jsx-a11y/no-autofocus */

import {
  ChangeEvent,
  type CSSProperties,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushOfflineCaptures, flushOfflineMutations, listOfflineQueue, offlinePendingCount, queueOfflineCapture, queueOfflineMutation, retryOfflineItem, type OfflineQueueItem } from "./offline-queue";
import { AppIcon } from "./components/AppIcon";
import { assessMealReliability } from "../server/meal-reliability.js";
import { HYDRATION_BEVERAGES, beverageNutrition, hydrationBeverage, hydrationContribution, hydrationTotal, normalizeCustomBeverage, removeLatestBeverageServing } from "../server/hydration.js";
import { findPossibleDuplicate } from "../server/food-learning.js";

type AppState = {
  authenticated?: boolean;
  bootstrapRequired?: boolean;
  owner: null | { name: string; email: string; role: string; avatar?: string };
  currentUser: { id: string; name: string; role: "admin" | "user" };
  profile: any;
  today: { date: string; waterMl: number; waterEvents?: any[]; meals: any[] };
  ai: any;
  aiUsage: any[];
  history: any[];
  measurements: any[];
  favorites: any[];
  activity: any[];
  dailyScore: { score: number; coverage?: number; status?: string; version?: string; components?: Record<string, any>; parameters?: any[]; recommendation?: string; parts: Record<string, number> };
  streak: number;
  coachHistory: { role: "user" | "assistant"; text: string; at?: string }[];
  foods: any[];
  partnerships: any[];
  shareCandidates: { id: string; name: string }[];
  sharedProfiles: any[];
  adminConfigured: boolean;
};
const emptyOnboarding = {
  name: "",
  email: "",
  goal: "lose",
  sex: "male",
  birthDate: "",
  age: 35,
  height: 175,
  weight: 85,
  targetWeight: 76,
  activity: "light",
  workouts: 2,
  workoutTypes: [] as string[],
  diet: "none",
  restrictions: "",
  journeyStage: "starting",
  journeyWeeks: 0,
  journeyStartingWeight: 0,
  journeyRecentChangeKg: 0,
  previousCalorieTarget: 0,
  plateauWeeks: 0,
  priorApproach: "",
  mainChallenge: "",
  trainingExperience: "beginner",
  preferredPace: "moderate",
  theme: "dark",
  language: "he",
  adminPassword: "",
};
const goalLabels: Record<string, string> = {
  lose: "חיטוב — ירידה מתונה תוך דגש על שמירת שריר",
  maintain: "שמירה — משקל והרכב גוף יציבים",
  gain: "עלייה במסת שריר — עודף מתון ומבוקר",
  fitness: "ביצועים והתאוששות — תמיכה באימונים",
  healthy: "אורח חיים מאוזן",
};
const workoutTypeLabels: Record<string, string> = { walking: "הליכה", running: "ריצה", strength: "אימון כוח", cycling: "רכיבה", swimming: "שחייה", yoga: "יוגה / גמישות", other: "אחר" };
const journeyStageLabels: Record<string, string> = { starting: "אני מתחיל עכשיו", early: "כבר התחלתי לאחרונה", established: "אני כבר בתהליך קבוע", plateau: "אני בתקיעות", returning: "חוזר אחרי הפסקה", transition: "עובר ממסה לחיטוב או להפך" };
const coachHelpQuestions = {
  coach: ["מה כדאי לי לאכול עכשיו לפי מה שחסר לי היום?", "איך היום שלי מתקדם ומה הצעד החשוב הבא?", "איך לשפר את איכות התזונה בלי לשנות הכול?", "הכן לי רעיון לארוחה שמתאים להעדפות וליעד שלי."],
  app: ["איך מוסיפים ארוחה מצילום?", "איך מתקנים ערכים של ארוחה שכבר הוספתי?", "איך מעדכנים משקל ורואים מגמה?", "איך מחושב הציון היומי?", "איך מפעילים התראות ומגדירים שעות שקטות?"],
};
const notificationPreferenceDefaults = { enabled: true, morningBrief: true, mealReminders: true, waterReminders: true, dailySummary: true, insights: true, coachTips: true, weeklyTrends: true, weightReminder: true, achievements: false, breakfastTime: "09:00", lunchTime: "14:00", dinnerTime: "20:00", waterTime: "16:30", summaryTime: "21:15", coachTime: "11:30", weeklyTime: "10:00", quietStart: "22:30", quietEnd: "07:00", maxPerDay: 5 };
const notificationTypeOptions = [
  ["morningBrief", "בוקר טוב וסיכום אתמול", "בכל יום ב־07:30: הציון והקלוריות של אתמול יחד עם מבט להיום"],
  ["mealReminders", "תזכורות ארוחות", "רק כאשר לא נרשמה ארוחה בזמן שבחרת"],
  ["waterReminders", "תזכורות שתייה", "רק כאשר קצב השתייה נמוך ביחס ליעד"],
  ["dailySummary", "סיכום יומי", "ציון, קלוריות ותמונת מצב בסוף היום"],
  ["insights", "תובנות וסיכומי ביניים", "עד שלושה מבטים קצרים על ההתקדמות במהלך היום"],
  ["coachTips", "מאמן פעיל", "המלצות מתחלפות לפי חלבון, סיבים, ירקות, מים ושאר הפערים שלך"],
  ["weeklyTrends", "מגמות שבועיות", "ממוצעים ושינויים חשובים פעם בשבוע"],
  ["weightReminder", "תזכורת שקילה", "רק אם לא הוזן משקל במשך יותר מ־14 יום"],
  ["achievements", "הישגים רגועים", "חיזוק חיובי על יום מאוזן, בלי לחץ או ענישה"],
] as const;
const notificationTestTypes: Record<string, string> = { morningBrief: "morning-brief", mealReminders: "meal-lunch", waterReminders: "water", dailySummary: "summary", insights: "insight", coachTips: "coach", weeklyTrends: "weekly", weightReminder: "weight", achievements: "achievement" };
const dietStyles = [
  ["none", "מאוזנת", "ללא הגבלה מיוחדת, עם גיוון בין קבוצות המזון"],
  ["mediterranean", "ים־תיכונית", "ירקות, קטניות, דגים, שמן זית ודגנים מלאים"],
  ["lowCarb", "דלת פחמימות", "פחות פחמימות, עם דגש על חלבון ושומן איכותי"],
  ["vegetarian", "צמחונית", "ללא בשר ודגים"],
  ["vegan", "טבעונית", "ללא מזון מן החי"],
  ["kosher", "כשרה", "שמירה על כללי כשרות"],
];
const mealSuggestionCatalog = [
  { name: "יוגורט, שיבולת שועל ופירות", periods: ["breakfast", "snack"], kcal: 340, protein: 23, carbs: 43, fat: 8, tags: ["חלבי", "מתוק", "פירות", "מהיר"] },
  { name: "חביתה, קוטג׳ וסלט", periods: ["breakfast", "dinner"], kcal: 390, protein: 34, carbs: 18, fat: 20, tags: ["ביצים", "חלבי", "מלוח", "ירקות"] },
  { name: "כריך טונה וירקות", periods: ["breakfast", "lunch", "dinner"], kcal: 430, protein: 38, carbs: 45, fat: 11, tags: ["דגים", "מלוח", "מהיר"] },
  { name: "חזה עוף, אורז וסלט", periods: ["lunch", "dinner"], kcal: 610, protein: 52, carbs: 66, fat: 14, tags: ["עוף", "אורז", "ירקות", "חם"] },
  { name: "סלמון, בטטה וירקות", periods: ["lunch", "dinner"], kcal: 590, protein: 42, carbs: 48, fat: 24, tags: ["דגים", "ירקות", "חם"] },
  { name: "קערת עדשים, טחינה וירקות", periods: ["lunch", "dinner"], kcal: 520, protein: 25, carbs: 67, fat: 18, tags: ["קטניות", "טבעוני", "ירקות", "חם"] },
  { name: "קוטג׳, פרי ושקדים", periods: ["snack", "breakfast"], kcal: 280, protein: 22, carbs: 28, fat: 10, tags: ["חלבי", "פירות", "מהיר"] },
  { name: "חומוס, ביצה וירקות", periods: ["lunch", "dinner", "snack"], kcal: 410, protein: 20, carbs: 39, fat: 20, tags: ["קטניות", "ביצים", "ירקות", "מלוח"] },
  { name: "דייסת שיבולת שועל, יוגורט ותפוח", periods: ["breakfast", "snack"], kcal: 365, protein: 20, carbs: 55, fat: 8, tags: ["חלבי", "פירות", "דגנים מלאים", "סיבים"] },
  { name: "שקשוקה, לחם מלא וסלט", periods: ["breakfast", "lunch", "dinner"], kcal: 470, protein: 26, carbs: 47, fat: 20, tags: ["ביצים", "ירקות", "לחם", "חם"] },
  { name: "טוסט מלחם מלא, גבינה וירקות", periods: ["breakfast", "dinner"], kcal: 380, protein: 27, carbs: 43, fat: 12, tags: ["חלבי", "לחם", "ירקות", "מהיר"] },
  { name: "יוגורט, אגוזים וקיווי", periods: ["breakfast", "snack"], kcal: 300, protein: 20, carbs: 30, fat: 12, tags: ["חלבי", "פירות", "שקדים", "מהיר"] },
  { name: "סלט קינואה, גרגרי חומוס וירקות", periods: ["lunch", "dinner"], kcal: 510, protein: 22, carbs: 72, fat: 16, tags: ["קטניות", "טבעוני", "ירקות", "סיבים"] },
  { name: "קציצות הודו, תפוח אדמה וירקות", periods: ["lunch", "dinner"], kcal: 570, protein: 46, carbs: 54, fat: 18, tags: ["עוף", "ירקות", "חם"] },
  { name: "טופו מוקפץ, אורז וירקות", periods: ["lunch", "dinner"], kcal: 540, protein: 30, carbs: 68, fat: 17, tags: ["טבעוני", "אורז", "ירקות", "חם"] },
  { name: "דג בתנור, קינואה וסלט", periods: ["lunch", "dinner"], kcal: 550, protein: 45, carbs: 50, fat: 18, tags: ["דגים", "ירקות", "חם"] },
  { name: "מרק עדשים ופרוסת לחם מלא", periods: ["lunch", "dinner"], kcal: 430, protein: 24, carbs: 66, fat: 9, tags: ["קטניות", "טבעוני", "לחם", "סיבים", "חם"] },
  { name: "סלט טונה, שעועית וירקות", periods: ["lunch", "dinner"], kcal: 440, protein: 42, carbs: 35, fat: 15, tags: ["דגים", "קטניות", "ירקות", "סיבים"] },
  { name: "תפוח וחופן שקדים", periods: ["snack"], kcal: 220, protein: 6, carbs: 27, fat: 11, tags: ["פירות", "שקדים", "סיבים", "מהיר"] },
  { name: "ירקות חתוכים וטחינה", periods: ["snack"], kcal: 210, protein: 7, carbs: 18, fat: 13, tags: ["טבעוני", "ירקות", "טחינה", "מהיר"] },
  { name: "יוגורט עשיר בחלבון ופרי", periods: ["snack", "breakfast"], kcal: 230, protein: 25, carbs: 28, fat: 4, tags: ["חלבי", "פירות", "מהיר"] },
  { name: "ביצה קשה, ירקות וקרקר מלא", periods: ["snack", "breakfast"], kcal: 240, protein: 14, carbs: 23, fat: 11, tags: ["ביצים", "ירקות", "דגנים מלאים", "מהיר"] },
];
const tasteQuestions = [
  { title: "מקורות חלבון", options: ["עוף", "דגים", "ביצים", "חלבי", "קטניות", "טבעוני"] },
  { title: "סגנון וטעמים", options: ["מלוח", "מתוק", "חריף", "חם", "קר", "מהיר"] },
  { title: "תוספות אהובות", options: ["אורז", "לחם", "פירות", "ירקות", "טחינה", "שקדים"] },
];
const periodLabels: Record<string, string> = {
  breakfast: "ארוחת בוקר",
  lunch: "ארוחת צהריים",
  dinner: "ארוחת ערב",
  snack: "בין הארוחות",
};
const calculateMealDraft = (items: any[], form: any) => items.length ? items.reduce((total, item) => { const quantity = Math.max(.1, Number(item.quantity) || 1); const factor = Math.max(0, Number(item.grams) || 0) * quantity / 100; return { kcal: total.kcal + (Number(item.kcalPerUnit) > 0 ? Number(item.kcalPerUnit) * quantity : Number(item.kcalPer100 || 0) * factor), protein: total.protein + Number(item.proteinPer100 || 0) * factor, carbs: total.carbs + Number(item.carbsPer100 || 0) * factor, fat: total.fat + Number(item.fatPer100 || 0) * factor }; }, { kcal: 0, protein: 0, carbs: 0, fat: 0 }) : form;
const newForgottenMeal = () => ({ id: crypto.randomUUID(), description: "", dayOffset: 0, time: new Date().toTimeString().slice(0, 5), period: mealPeriodFor(), name: "", items: [] as any[], calculated: false, error: "" });
function localDateTimeInput(date = new Date()) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

function mealPeriodFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}
const quickFoods: Record<
  string,
  {
    name: string;
    icon: string;
    portion: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }[]
> = {
  vegetables: [
    {
      name: "עגבנייה",
      icon: "🍅",
      portion: "עגבנייה בינונית",
      kcal: 22,
      protein: 1,
      carbs: 5,
      fat: 0,
    },
    {
      name: "מלפפון",
      icon: "🥒",
      portion: "מלפפון בינוני",
      kcal: 24,
      protein: 1,
      carbs: 5,
      fat: 0,
    },
    {
      name: "גזר",
      icon: "🥕",
      portion: "גזר בינוני",
      kcal: 30,
      protein: 1,
      carbs: 7,
      fat: 0,
    },
    {
      name: "פלפל",
      icon: "🫑",
      portion: "פלפל בינוני",
      kcal: 31,
      protein: 1,
      carbs: 6,
      fat: 0,
    },
    {
      name: "ברוקולי",
      icon: "🥦",
      portion: "כוס מבושלת",
      kcal: 55,
      protein: 4,
      carbs: 11,
      fat: 1,
    },
    {
      name: "סלט ירקות",
      icon: "🥗",
      portion: "קערה, ללא רוטב",
      kcal: 80,
      protein: 3,
      carbs: 15,
      fat: 1,
    },
    {
      name: "קישוא",
      icon: "🥒",
      portion: "קישוא בינוני",
      kcal: 33,
      protein: 2,
      carbs: 6,
      fat: 1,
    },
    {
      name: "חציל",
      icon: "🍆",
      portion: "חציל בינוני",
      kcal: 114,
      protein: 5,
      carbs: 27,
      fat: 1,
    },
    {
      name: "כרובית",
      icon: "🥬",
      portion: "כוס מבושלת",
      kcal: 29,
      protein: 2,
      carbs: 5,
      fat: 1,
    },
    {
      name: "בטטה",
      icon: "🍠",
      portion: "בטטה בינונית",
      kcal: 112,
      protein: 2,
      carbs: 26,
      fat: 0,
    },
  ],
  fruits: [
    {
      name: "תפוח",
      icon: "🍎",
      portion: "תפוח בינוני",
      kcal: 95,
      protein: 1,
      carbs: 25,
      fat: 0,
    },
    {
      name: "בננה",
      icon: "🍌",
      portion: "בננה בינונית",
      kcal: 105,
      protein: 1,
      carbs: 27,
      fat: 0,
    },
    {
      name: "תפוז",
      icon: "🍊",
      portion: "תפוז בינוני",
      kcal: 62,
      protein: 1,
      carbs: 15,
      fat: 0,
    },
    {
      name: "ענבים",
      icon: "🍇",
      portion: "כוס",
      kcal: 104,
      protein: 1,
      carbs: 27,
      fat: 0,
    },
    {
      name: "תותים",
      icon: "🍓",
      portion: "כוס",
      kcal: 49,
      protein: 1,
      carbs: 12,
      fat: 0,
    },
    {
      name: "אגס",
      icon: "🍐",
      portion: "אגס בינוני",
      kcal: 101,
      protein: 1,
      carbs: 27,
      fat: 0,
    },
    {
      name: "מנגו",
      icon: "🥭",
      portion: "כוס חתוכה",
      kcal: 99,
      protein: 1,
      carbs: 25,
      fat: 1,
    },
    {
      name: "שזיף",
      icon: "🟣",
      portion: "שזיף בינוני",
      kcal: 30,
      protein: 0,
      carbs: 8,
      fat: 0,
    },
    {
      name: "מלון",
      icon: "🍈",
      portion: "כוס חתוכה",
      kcal: 54,
      protein: 1,
      carbs: 13,
      fat: 0,
    },
    {
      name: "אשכולית",
      icon: "🍊",
      portion: "חצי אשכולית",
      kcal: 52,
      protein: 1,
      carbs: 13,
      fat: 0,
    },
    {
      name: "אבטיח",
      icon: "🍉",
      portion: "שתי כוסות חתוכות",
      kcal: 92,
      protein: 2,
      carbs: 23,
      fat: 0,
    },
    {
      name: "קיווי",
      icon: "🥝",
      portion: "שני פירות",
      kcal: 84,
      protein: 2,
      carbs: 20,
      fat: 1,
    },
    {
      name: "אפרסק",
      icon: "🍑",
      portion: "אפרסק בינוני",
      kcal: 59,
      protein: 1,
      carbs: 14,
      fat: 0,
    },
  ],
  drinks: [
    {
      name: "מים",
      icon: "💧",
      portion: "כוס 250 מ״ל",
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
    {
      name: "קפה שחור",
      icon: "☕",
      portion: "כוס ללא סוכר",
      kcal: 5,
      protein: 0,
      carbs: 1,
      fat: 0,
    },
    {
      name: "קפה עם חלב",
      icon: "☕",
      portion: "כוס בינונית",
      kcal: 90,
      protein: 5,
      carbs: 9,
      fat: 4,
    },
    {
      name: "תה",
      icon: "🍵",
      portion: "כוס ללא סוכר",
      kcal: 2,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
    {
      name: "משקה קל",
      icon: "🥤",
      portion: "פחית 330 מ״ל",
      kcal: 139,
      protein: 0,
      carbs: 35,
      fat: 0,
    },
    {
      name: "יין",
      icon: "🍷",
      portion: "כוס 150 מ״ל",
      kcal: 125,
      protein: 0,
      carbs: 4,
      fat: 0,
    },
    {
      name: "בירה",
      icon: "🍺",
      portion: "בקבוק 330 מ״ל",
      kcal: 142,
      protein: 1,
      carbs: 11,
      fat: 0,
    },
  ],
};

function foodSpriteStyle(category: string, index: number) {
  const layout =
    category === "fruits"
      ? { columns: 5, rows: 3, file: "food-sprite-fruits-v4.webp" }
      : category === "vegetables"
        ? { columns: 4, rows: 3, file: "food-sprite-vegetables-v4.webp" }
        : { columns: 4, rows: 2, file: "food-sprite-drinks-v3.webp" };
  const column = index % layout.columns;
  const row = Math.floor(index / layout.columns);
  return {
    backgroundImage: `url(${layout.file})`,
    backgroundSize: `${layout.columns * 100}% ${layout.rows * 100}%`,
    backgroundPosition: `${layout.columns === 1 ? 0 : (column * 100) / (layout.columns - 1)}% ${layout.rows === 1 ? 0 : (row * 100) / (layout.rows - 1)}%`,
  };
}

function goalStatus(value: number, target: number) {
  if (!target) return { className: "goal-unknown", label: "אין יעד" };
  const ratio = value / target;
  if (ratio < 0.9) return { className: "goal-under", label: "מתחת ליעד" };
  if (ratio < 0.98) return { className: "goal-near", label: "קרוב ליעד" };
  if (ratio <= 1.05) return { className: "goal-on", label: "בטווח היעד" };
  return { className: "goal-over", label: "מעל היעד" };
}
function clientLocalDate(date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function exactAge(birthDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birthDate || ""))) return null;
  const birth = new Date(`${birthDate}T12:00:00`); if (!Number.isFinite(birth.getTime()) || birth > new Date()) return null;
  const today = new Date(); let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

async function queueMutation(url: string, method: string, body: string, id = crypto.randomUUID()) {
  await queueOfflineMutation({ id, url, method, body, createdAt: new Date().toISOString() });
  return id;
}

async function api(url: string, options?: RequestInit) {
  const target = url.startsWith("/") ? url.slice(1) : url;
  const multipart = options?.body instanceof FormData;
  const response = await fetch(target, {
    ...options,
    cache: "no-store",
    headers: multipart
      ? options?.headers
      : {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
  });
  const body = await response.text();
  let data: any;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`השרת החזיר תשובה לא תקינה (${response.status})`);
  }
  if (!response.ok) throw new Error(data.error || "הפעולה נכשלה");
  return data;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const binary = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function sameApplicationServerKey(current: ArrayBuffer | null, expected: Uint8Array) {
  if (!current) return false;
  const actual = new Uint8Array(current);
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string) {
  return Promise.race([promise, new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), milliseconds))]);
}

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);
  const [onboarding, setOnboarding] = useState({ ...emptyOnboarding });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUserEdits, setAdminUserEdits] = useState<Record<string, { email: string; password: string }>>({});
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [mealOpen, setMealOpen] = useState(false);
  const [editingMealId, setEditingMealId] = useState("");
  const [undoMeal, setUndoMeal] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [mealForm, setMealForm] = useState({
    name: "",
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [mealItems, setMealItems] = useState<any[]>([]);
  const [mealValidationErrors, setMealValidationErrors] = useState<Record<string, string>>({});
  const [mealSaveFeedback, setMealSaveFeedback] = useState("");
  const [mealReviewReady, setMealReviewReady] = useState(false);
  const [mealDetailsOpen, setMealDetailsOpen] = useState(false);
  const [aiOriginalItems, setAiOriginalItems] = useState<any[]>([]);
  const [mealSource, setMealSource] = useState<"manual" | "photo" | "voice">(
    "manual",
  );
  const [mealTranscript, setMealTranscript] = useState("");
  const [analysisJobId, setAnalysisJobId] = useState("");
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState("");
  const [foodVisibility, setFoodVisibility] = useState<"private" | "shared">(
    "private",
  );
  const [generateFoodArtwork, setGenerateFoodArtwork] = useState(false);
  const [mealPeriod, setMealPeriod] = useState("snack");
  const [mealDateTime, setMealDateTime] = useState(() => localDateTimeInput());
  const [message, setMessage] = useState("");
  const [coachListening, setCoachListening] = useState(false);
  const [coachTranscribing, setCoachTranscribing] = useState(false);
  const [coachVoice, setCoachVoice] = useState<"male" | "female">("male");
  const [coachVoiceStyle, setCoachVoiceStyle] = useState<"warm" | "clear">("warm");
  const [coachVoiceProvider, setCoachVoiceProvider] = useState<"cloud" | "device">("cloud");
  const [coachSpeaking, setCoachSpeaking] = useState(false);
  const [coachSpeechPending, setCoachSpeechPending] = useState(false);
  const [dayCloseConfirm, setDayCloseConfirm] = useState(false);
  const coachAudio = useRef<HTMLAudioElement | null>(null);
  const coachAudioUrl = useRef("");
  const coachAudioContext = useRef<AudioContext | null>(null);
  const coachAudioSource = useRef<AudioBufferSourceNode | null>(null);
  const coachSpeechRequest = useRef<AbortController | null>(null);
  const coachSpeechRun = useRef(0);
  const coachSendInFlight = useRef(false);
  const coachRecorder = useRef<MediaRecorder | null>(null);
  const coachRecordingStream = useRef<MediaStream | null>(null);
  const coachAudioChunks = useRef<Blob[]>([]);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string; usage?: string }[]
  >([]);
  const [coachHelpOpen, setCoachHelpOpen] = useState(false);
  const [aiForm, setAiForm] = useState({
    provider: "openai",
    model: "gpt-5-mini",
    coachModel: "gpt-5-mini",
    visionModel: "gpt-5-mini",
    imageModel: "gpt-image-1-mini",
    coachFallbackModel: "",
    visionFallbackModel: "",
    imageFallbackModel: "",
    apiKey: "",
    inputCost: 0.25,
    outputCost: 2,
    monthlyBudget: 2,
    softLimit: 70,
    hardLimit: true,
    economyMode: true,
    autoGenerateMealImages: false,
    cloudTtsEnabled: false,
  });
  const [aiStatus, setAiStatus] = useState("");
  const [modelCatalog, setModelCatalog] = useState<Record<string, any[]>>({
    openai: [],
    gemini: [],
  });
  const [imageModelCatalog, setImageModelCatalog] = useState<
    Record<string, any[]>
  >({ openai: [], gemini: [] });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [aiCorrection, setAiCorrection] = useState("");
  const [aiCorrectionStatus, setAiCorrectionStatus] = useState("");
  const [photoQuality, setPhotoQuality] = useState<{ level: "good" | "warning"; message: string } | null>(null);
  const [mealConfidence, setMealConfidence] = useState<"low" | "medium" | "high">("low");
  const [mealResult, setMealResult] = useState<any>(null);
  const [recentUndo, setRecentUndo] = useState<{ kind: "meal" | "water" | "activity"; id?: string; name: string; amount?: number; beverageId?: string } | null>(null);
  const [calorieOverage, setCalorieOverage] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [notificationStatus, setNotificationStatus] = useState("");
  const [testingNotificationType, setTestingNotificationType] = useState("");
  const [historyDeleteRequest, setHistoryDeleteRequest] = useState<{ kind: "meal"; id: string; date: string; password: string } | null>(null);
  useEffect(() => {
    if (!mealResult) return;
    const timer = window.setTimeout(() => setMealResult(null), 15_000);
    return () => window.clearTimeout(timer);
  }, [mealResult]);
  useEffect(() => {
    if (!recentUndo) return;
    const timer = window.setTimeout(() => setRecentUndo(null), 15_000);
    return () => window.clearTimeout(timer);
  }, [recentUndo]);
  const [weightValue, setWeightValue] = useState(0);
  const [weightDate, setWeightDate] = useState("");
  const [weightFeedback, setWeightFeedback] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [forgottenOpen, setForgottenOpen] = useState(false);
  const [forgottenMeals, setForgottenMeals] = useState<any[]>([]);
  const [forgottenStatus, setForgottenStatus] = useState("");
  const [quickCategory, setQuickCategory] = useState("");
  const [quickSearch, setQuickSearch] = useState("");
  const [onlineFoodResults, setOnlineFoodResults] = useState<any[]>([]);
  const [onlineFoodStatus, setOnlineFoodStatus] = useState("");
  const [quickFoodWeight, setQuickFoodWeight] = useState(100);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeStatus, setBarcodeStatus] = useState("");
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [cameraCaptureOpen, setCameraCaptureOpen] = useState(false);
  const [cameraHint, setCameraHint] = useState("");
  const [cameraStatus, setCameraStatus] = useState("");
  const [adminHealth, setAdminHealth] = useState<any>(null);
  const [adminTab, setAdminTab] = useState("ai");
  const [adminBackups, setAdminBackups] = useState<any[]>([]);
  const [backupType, setBackupType] = useState("database");
  const [adminAudit, setAdminAudit] = useState<any[]>([]);
  const [storageForm, setStorageForm] = useState({
    backupDestination: "internal",
    backupRelativePath: "CALOREAZI/Backups",
    galleryDestination: "internal",
    galleryRelativePath: "CALOREAZI/Gallery",
    automaticBackup: true,
    backupHour: 3,
    backupRetention: 14,
  });
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [storagePendingMedia, setStoragePendingMedia] = useState(0);
  const [databaseStatus, setDatabaseStatus] = useState<any>(null);
  const [online, setOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [offlineQueueItems, setOfflineQueueItems] = useState<OfflineQueueItem[]>([]);
  const [syncCenterOpen, setSyncCenterOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"offline" | "idle" | "syncing" | "success" | "attention">("idle");
  const [syncRequested, setSyncRequested] = useState(0);
  const [waterOpen, setWaterOpen] = useState(false);
  const [waterValue, setWaterValue] = useState(0);
  const [waterTargetValue, setWaterTargetValue] = useState(2000);
  const [selectedHydrationBeverages, setSelectedHydrationBeverages] = useState<string[]>([]);
  const [customHydrationBeverages, setCustomHydrationBeverages] = useState<any[]>([]);
  const [customBeverageOpen, setCustomBeverageOpen] = useState(false);
  const [customBeverageDraft, setCustomBeverageDraft] = useState({ name: "", defaultAmount: 250, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0, factor: .9 });
  const [profileOpen, setProfileOpen] = useState(false);
  const [acquaintanceOpen, setAcquaintanceOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"basic" | "health" | "goals" | "notifications" | "account">("basic");
  const [profileForm, setProfileForm] = useState<any>({});
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState({ currentWeight: 0, targetWeight: 0, goal: "lose", journeyStage: "starting", journeyWeeks: 0, journeyStartingWeight: 0, journeyRecentChangeKg: 0, previousCalorieTarget: 0, plateauWeeks: 0, priorApproach: "", mainChallenge: "", trainingExperience: "beginner", preferredPace: "moderate", workouts: 2, workoutTypes: [] as string[] });
  const [tasteWizardOpen, setTasteWizardOpen] = useState(false);
  const [tasteWizardStep, setTasteWizardStep] = useState(0);
  const [tasteDraft, setTasteDraft] = useState<any>({ likes: [], dislikes: [], prepTime: "medium" });
  const [suggestionPeriod, setSuggestionPeriod] = useState("");
  const [suggestionRefresh, setSuggestionRefresh] = useState(0);
  const [macroDetail, setMacroDetail] = useState<"protein" | "carbs" | "fat" | "">("");
  const [mealPreview, setMealPreview] = useState<any>(null);
  const [mealPreviewReturnToHistory, setMealPreviewReturnToHistory] = useState(false);
  const [mealPreviewReturnToInsights, setMealPreviewReturnToInsights] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySelectedDate, setHistorySelectedDate] = useState("");
  const [historyCalendarMonth, setHistoryCalendarMonth] = useState("");
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [hydrationTrendPeriod, setHydrationTrendPeriod] = useState<"day" | "week" | "month">("month");
  const [insightsData, setInsightsData] = useState<any>(null);
  useEffect(() => {
    if (!insightsOpen || !insightsData?.recommendationRefreshAt) return;
    const delay = Math.max(5_000, new Date(insightsData.recommendationRefreshAt).getTime() - Date.now() + 1_000);
    const timer = window.setTimeout(() => {
      api("/api/insights").then((latest) => setInsightsData((current: any) => ({ ...latest, goalPlan: current?.goalPlan }))).catch(() => undefined);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [insightsOpen, insightsData?.recommendationRefreshAt]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    description: "",
    type: "הליכה",
    minutes: 30,
    steps: 0,
    distanceKm: 0,
    activeCalories: 0,
    intensity: "medium",
  });
  const [activityAiStatus, setActivityAiStatus] = useState("");
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState(
    "לחץ על המיקרופון ותאר מה אכלת ובאיזו כמות.",
  );
  const [voiceProcessingSeconds, setVoiceProcessingSeconds] = useState(0);
  const [partnerForm, setPartnerForm] = useState({
    email: "",
    userIds: [] as string[],
    daily: true,
    meals: true,
    weight: false,
    trends: false,
  });
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [pendingQuickFood, setPendingQuickFood] = useState<any>(null);
  const [manualDescription, setManualDescription] = useState("");
  const [manualPortion, setManualPortion] = useState("");
  const [foodCategory, setFoodCategory] = useState("meals");
  const [manualAiMode, setManualAiMode] = useState(false);
  const [catalogOnly, setCatalogOnly] = useState(false);
  const [customFoodOpen, setCustomFoodOpen] = useState(false);
  const [customFoodName, setCustomFoodName] = useState("");
  const [customFoodDraft, setCustomFoodDraft] = useState<any>(null);
  const [customFoodStatus, setCustomFoodStatus] = useState("");
  const [foodLibraryOpen, setFoodLibraryOpen] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState<any>(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [editingFood, setEditingFood] = useState<any>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const directCameraInput = useRef<HTMLInputElement>(null);
  const barcodeVideo = useRef<HTMLVideoElement>(null);
  const mealCameraVideo = useRef<HTMLVideoElement>(null);
  const mealCameraStream = useRef<MediaStream | null>(null);
  const barcodeScanLocked = useRef(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const foodImageInput = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mealSaveInFlight = useRef(false);
  const duplicateMealApproval = useRef("");
  const mealInteractionStartedAt = useRef(Date.now());
  const waterMutationInFlight = useRef(false);
  const mealSaveRequestId = useRef("");
  useEffect(() => { if (mealOpen) mealInteractionStartedAt.current = Date.now(); }, [mealOpen]);
  const mealEditBaseUpdatedAt = useRef("");
  const imageCompletionRequested = useRef(new Set<string>());
  const audioChunks = useRef<Blob[]>([]);
  const recordingStartedAt = useRef(0);
  const speechRecognition = useRef<any>(null);
  const coachSpeechRecognition = useRef<any>(null);
  const coachTranscript = useRef("");
  const browserTranscript = useRef("");
  const voiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceProcessingTimer = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => () => {
    mealCameraStream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => { if (!mealOpen) setFavoriteStatus(""); }, [mealOpen]);

  useEffect(() => {
    api("/api/state")
      .then((data) => {
        setState(data);
        setCoachVoice(data.profile?.coachVoice === "female" ? "female" : "male");
        setCoachVoiceStyle(data.profile?.coachVoiceStyle === "clear" ? "clear" : "warm");
        setCoachVoiceProvider(data.profile?.coachVoiceProvider === "device" ? "device" : "cloud");
        setMessages(Array.isArray(data.coachHistory) ? data.coachHistory : []);
        if (data.owner)
          setOnboarding((current) => ({
            ...current,
            name: data.owner.name || "",
            email: data.owner.email || "",
          }));
        if (data.currentUser?.role === "admin")
          setAiForm((current) => ({ ...current, ...data.ai, apiKey: "" }));
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (coachOpen) return;
    coachSpeechRun.current += 1;
    coachSpeechRequest.current?.abort();
    coachSpeechRequest.current = null;
    try { coachAudioSource.current?.stop(); } catch { /* source may already be stopped */ }
    coachAudioSource.current = null;
    coachAudio.current?.pause();
    coachAudio.current = null;
    coachTranscript.current = "";
    coachSpeechRecognition.current?.abort?.();
    coachRecorder.current?.stop?.();
    coachRecordingStream.current?.getTracks().forEach((track) => track.stop());
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setCoachListening(false);
    setCoachSpeaking(false);
    setCoachSpeechPending(false);
  }, [coachOpen]);

  useEffect(() => {
    const meal = state?.today?.meals?.find((item) => item.id && (!item.image || /(?:category-|food-sprite-|generic|placeholder)/i.test(String(item.image))) && !imageCompletionRequested.current.has(item.id));
    if (!meal) return;
    imageCompletionRequested.current.add(meal.id);
    api("/api/meals/image", { method: "POST", body: JSON.stringify({ id: meal.id, allowGenerate: state?.ai?.autoGenerateMealImages === true && state?.ai?.economyMode === false }) }).then(setState).catch(() => undefined);
  }, [state]);
  useEffect(() => {
    let lastLocalDate = localDateTimeInput().slice(0, 10);
    const timer = window.setInterval(() => {
      const current = new Date();
      setNow(current);
      const nextLocalDate = localDateTimeInput(current).slice(0, 10);
      if (nextLocalDate !== lastLocalDate) {
        lastLocalDate = nextLocalDate;
        api("/api/state").then(setState).catch(() => undefined);
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setOnline(navigator.onLine);
    let syncing = false;
    const refreshQueue = async () => { const items = await listOfflineQueue(); setOfflineQueueItems(items); setOfflineQueueCount(items.length); if (items.some((item) => item.attempts >= 3)) setSyncStatus("attention"); return items; };
    const update = async () => {
      setOnline(navigator.onLine); if (syncing) return;
      if (!navigator.onLine) { setSyncStatus("offline"); refreshQueue().catch(() => undefined); return; }
      syncing = true;
      setSyncStatus("syncing");
      try {
        const mutationsSent = await flushOfflineMutations(async (mutation) => { await api(mutation.url, { method: mutation.method, headers: { "Idempotency-Key": mutation.id }, body: mutation.body }); });
        const capturesSent = await flushOfflineCaptures(async (capture) => {
          let result = await api("/api/ai/analyze-meal", { method: "POST", headers: { "Idempotency-Key": capture.clientId }, body: JSON.stringify(capture) });
          if (!result.items && result.jobId) result = await api(`/api/ai/analyze-meal?id=${encodeURIComponent(result.jobId)}`);
          result = result.result ? { ...result.result, jobId: result.jobId } : result;
          if (!result.items) throw new Error("הצילום עדיין ממתין לניתוח");
          setPhotoPreview(capture.imageDataUrl); setMealSource("photo"); setMealForm({ name: result.name, kcal: 0, protein: 0, carbs: 0, fat: 0 }); setMealItems(result.items); setAiOriginalItems(structuredClone(result.items)); setMealConfidence(result.confidence || "low"); setMealReviewReady(true); setPhotoStatus("הצילום שסונכרן נותח ומוכן לבדיקה ולאישור."); setMealOpen(true);
        });
        const latest = await api("/api/state"); setState(latest);
        const remaining = await refreshQueue();
        setSyncStatus(remaining.some((item) => item.attempts >= 3) ? "attention" : remaining.length ? "idle" : mutationsSent + capturesSent > 0 ? "success" : "idle");
      } catch { const remaining = await refreshQueue().catch(() => []); setSyncStatus(remaining.some((item) => item.attempts >= 3) ? "attention" : "idle"); }
      finally { syncing = false; }
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const visibility = () => { if (document.visibilityState === "visible") void update(); };
    document.addEventListener("visibilitychange", visibility);
    const retryTimer = window.setInterval(() => { if (navigator.onLine) void update(); }, 15_000);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("./sw.js").catch(() => undefined);
    void update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      document.removeEventListener("visibilitychange", visibility);
      window.clearInterval(retryTimer);
    };
  }, [syncRequested]);
  useEffect(() => {
    const saved = window.localStorage.getItem("caloreazi-theme");
    if (saved) setDark(saved === "dark");
  }, []);
  useEffect(() => {
    window.localStorage.setItem("caloreazi-theme", dark ? "dark" : "light");
    document.documentElement.style.backgroundColor = dark ? "#0b0c0c" : "#f7f5f0";
    document.body.style.backgroundColor = dark ? "#0b0c0c" : "#f7f5f0";
    document.querySelectorAll('meta[name="theme-color"]').forEach((element) => element.remove());
    const themeColor = document.createElement("meta");
    themeColor.name = "theme-color";
    themeColor.content = dark ? "#0b0c0c" : "#f7f5f0";
    document.head.appendChild(themeColor);
  }, [dark]);
  useEffect(() => {
    if (!mealOpen) {
      setMealValidationErrors({});
      setMealSaveFeedback("");
      setMealReviewReady(false);
    }
  }, [mealOpen]);

  useEffect(() => {
    const query = quickSearch.trim();
    if (!quickAddOpen || query.length < 2) { setOnlineFoodResults([]); setOnlineFoodStatus(""); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setOnlineFoodStatus("מחפש במאגר המוצרים…");
      fetch(`/api/foods/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "החיפוש נכשל"); return data; })
        .then((data) => { setOnlineFoodResults(data.products || []); setOnlineFoodStatus((data.products || []).length ? `${data.attribution || "מאגר תזונה מקוון"} · ערכים ל־100 גרם` : "לא נמצאו מוצרים תואמים"); })
        .catch((error) => { if (error.name !== "AbortError") setOnlineFoodStatus("המאגר המקוון אינו זמין כרגע"); });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [quickSearch, quickAddOpen]);

  useEffect(() => {
    if (!barcodeScannerOpen || !barcodeVideo.current) return;
    let stopped = false;
    let controls: { stop: () => void } | undefined;
    barcodeScanLocked.current = false;
    setBarcodeStatus("כוון את הברקוד למרכז המסגרת — הזיהוי אוטומטי");
    import("@zxing/browser").then(async ({ BrowserMultiFormatReader }) => {
      const reader = new BrowserMultiFormatReader();
      controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }, barcodeVideo.current!, (result) => {
        if (!result || stopped || barcodeScanLocked.current) return;
        barcodeScanLocked.current = true;
        const value = result.getText();
        setBarcodeValue(value);
        setBarcodeScannerOpen(false);
        void lookupBarcode(value);
      });
    }).catch(() => { setBarcodeStatus("לא ניתן לפתוח את המצלמה. ודא שניתנה הרשאת מצלמה או הזן את הברקוד ידנית."); });
    return () => { stopped = true; controls?.stop(); const stream = barcodeVideo.current?.srcObject as MediaStream | null; stream?.getTracks().forEach((track) => track.stop()); };
  }, [barcodeScannerOpen]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible")
        api("/api/state")
          .then(setState)
          .catch(() => undefined);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const polling = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(polling);
    };
  }, []);
  const profile = state?.profile;
  const coachIsFemale = profile?.coachGender === "female";
  const coachDisplayName = String(profile?.coachName || "Cal").toLowerCase() === "ezi" ? "Eazi" : "Cal";
  const coachRole = coachIsFemale ? "המאמנת" : "המאמן";
  const coachRecommendationTitle = coachIsFemale ? "המלצות מהמאמנת" : "המלצות מהמאמן";
  const consumed = useMemo(
    () =>
      state?.today?.meals?.reduce(
        (sum, meal) => sum + Number(meal.kcal || 0),
        0,
      ) || 0,
    [state],
  );
  const macros = useMemo(
    () =>
      state?.today?.meals?.reduce(
        (totals, meal) => ({
          protein: totals.protein + Number(meal.protein || 0),
          carbs: totals.carbs + Number(meal.carbs || 0),
          fat: totals.fat + Number(meal.fat || 0),
        }),
        { protein: 0, carbs: 0, fat: 0 },
      ) || { protein: 0, carbs: 0, fat: 0 },
    [state],
  );
  const isTrainingDay = Boolean(state?.activity?.some((item) => item.date === state?.today?.date && Number(item.minutes || 0) > 0));
  const dailyCalorieTarget = Number(profile?.calories || 0) + (isTrainingDay ? Number(profile?.trainingDayBonus || 0) : 0);
  const remaining = Math.max(0, dailyCalorieTarget - consumed);
  const dailyScore = Math.max(0, Math.min(100, Number(state?.dailyScore?.score || 0)));
  const scoreToneFor = (score: number) => score < 20 ? "red" : score < 40 ? "orange" : score < 60 ? "yellow" : score < 80 ? "blue" : "green";
  const historyScoreText = (day: any) => {
    const result = day?.dailyScore || {}; const score = Number(result.score || 0);
    if (result.status === "insufficient") return `אין מספיק נתונים לציון מלא (כיסוי ${Number(result.coverage || 0)}%). ${result.recommendation || "כדאי להשלים תיעוד."}`;
    return `ציון ${score}/100 לפי מנוע ${result.version || "1.0"}. ${result.recommendation || "כדאי להמשיך בתיעוד עקבי."}`;
  };
  const scoreTone = scoreToneFor(dailyScore);
  const componentLabels: Record<string,string> = { quality: "איכות תזונתית", targets: "התאמה ליעדים", habits: "הרגלים ועקביות" };
  const scoreParameters = (state?.dailyScore?.parameters || []).filter((item: any) => item.available);
  const scoreGuidance = Object.entries(state?.dailyScore?.components || {}).map(([key, part]: any) => { const weak = scoreParameters.filter((item: any) => item.group === key).sort((a: any, b: any) => a.percent - b.percent).slice(0, 2); return { key, label: componentLabels[key] || key, value: Number(part.score || 0), max: Number(part.max || 0), coverage: Number(part.coverage || 0), tip: weak[0]?.tip || state?.dailyScore?.recommendation || "להמשיך בתיעוד.", why: weak.length ? `${weak.map((item: any) => `${item.label} ${item.percent}%`).join(" · ")}. ${weak[0].tip}` : "נדרש עוד מידע כדי להסביר את הרכיב." }; });
  const scoreImprovement = [...scoreGuidance].sort((a, b) => (b.max - b.value) - (a.max - a.value))[0] || { tip: "להשלים תיעוד כדי לקבל המלצה מדויקת." };
  const scoreHeadline = dailyScore >= 80 ? "יום מאוזן מאוד — המשך כך." : dailyScore >= 60 ? `כיוון טוב — ${scoreImprovement.tip}` : dailyScore >= 40 ? `יש בסיס טוב. ${scoreImprovement.tip}` : `אפשר לשפר כבר היום: ${scoreImprovement.tip}`;
  const currentStreak = Number(state?.streak || 0);
  const consistencyBadges = [
    ...(currentStreak >= 1 ? [{ icon: "✓", label: "תיעוד היום" }] : []),
    ...(currentStreak >= 3 ? [{ icon: "◇", label: `${currentStreak} ימים בקצב שלך` }] : []),
    ...(currentStreak >= 7 ? [{ icon: "★", label: "שבוע של עקביות" }] : []),
    ...(dailyScore >= 80 ? [{ icon: "◎", label: "יום מאוזן" }] : []),
  ].slice(0, 3);
  const activityToday = (state?.activity || []).filter((item: any) => item.date === state?.today?.date).reduce((sum: number, item: any) => sum + Number(item.minutes || 0), 0);
  const challengeParameter = (key: string) => (state?.dailyScore?.parameters || []).find((item: any) => item.key === key && item.available);
  const calmChallengePool = [
    ...(macros.protein < Number(profile?.protein || 0) * .75 ? [{ label: "חלבון בקצב נוח", value: macros.protein, target: Number(profile?.protein || 1), unit: "גרם", tone: "protein" }] : []),
    ...(Number(state?.today?.waterMl || 0) < Number(profile?.waterMl || 0) * .8 ? [{ label: "שתייה לאורך היום", value: Number(state?.today?.waterMl || 0), target: Number(profile?.waterMl || 1), unit: "מ״ל", tone: "water" }] : []),
    ...(challengeParameter("produce")?.percent < 80 ? [{ label: "ירקות ופירות", value: Number(challengeParameter("produce")?.value || 0), target: Number(challengeParameter("produce")?.target || 400), unit: "גרם", tone: "produce" }] : []),
    ...(challengeParameter("fiber")?.percent < 80 ? [{ label: "מקור סיבים היום", value: Number(challengeParameter("fiber")?.value || 0), target: Number(challengeParameter("fiber")?.target || 25), unit: "גרם", tone: "fiber" }] : []),
    ...(activityToday < 20 ? [{ label: profile?.journey?.stage === "plateau" ? "תנועה קלה לשבירת שגרה" : "תנועה שמתאימה לקצב שלך", value: activityToday, target: 20, unit: "דקות", tone: "activity" }] : []),
    ...((state?.today?.meals?.length || 0) < 2 ? [{ label: "תיעוד שמאפשר למאמן לדייק", value: state?.today?.meals?.length || 0, target: 2, unit: "ארוחות", tone: "tracking" }] : []),
  ];
  const calmChallengeOptions = [...calmChallengePool, { label: "לשמור על רצף בלי לחץ", value: Math.min(1, state?.today?.meals?.length || 0), target: 1, unit: "צעד", tone: "steady" }];
  const calmChallengeOffset = (Number(String(state?.today?.date || "").replaceAll("-", "")) + Math.floor(now.getHours() / 4)) % calmChallengeOptions.length;
  const calmChallenges = Array.from({ length: Math.min(3, calmChallengeOptions.length) }, (_, index) => calmChallengeOptions[(calmChallengeOffset + index) % calmChallengeOptions.length]);
  const mealSuggestions = useMemo(() => {
    const taste = profile?.tasteProfile || { likes: [], dislikes: [] }; const likes = taste.likes || []; const dislikes = taste.dislikes || []; const blocked = `${profile?.restrictions || ""} ${profile?.foodAllergies || ""}`.toLocaleLowerCase("he");
    const proteinGap = Math.max(0, Number(profile?.protein || 0) - macros.protein); const carbsGap = Math.max(0, Number(profile?.carbs || 0) - macros.carbs); const fatGap = Math.max(0, Number(profile?.fat || 0) - macros.fat);
    const qualityGaps = (state?.dailyScore?.parameters || []).filter((item: any) => item.available && ["fiber", "produce"].includes(item.key)).sort((a: any, b: any) => a.percent - b.percent); const qualityGap = qualityGaps[0];
    const ranked = mealSuggestionCatalog.filter((meal) => meal.periods.includes(suggestionPeriod) && !meal.tags.some((tag) => dislikes.includes(tag) || blocked.includes(tag.toLocaleLowerCase("he"))) && !(profile?.diet === "vegan" && meal.tags.some((tag) => ["עוף", "דגים", "ביצים", "חלבי"].includes(tag))) && !(profile?.diet === "vegetarian" && meal.tags.some((tag) => ["עוף", "דגים"].includes(tag)))).map((meal) => {
      const preference = meal.tags.filter((tag) => likes.includes(tag)).length * 18; const quality = qualityGap?.key === "fiber" && meal.tags.includes("סיבים") ? 24 : qualityGap?.key === "produce" && (meal.tags.includes("ירקות") || meal.tags.includes("פירות")) ? 20 : 0; const nutrition = Math.min(proteinGap, meal.protein) * 1.4 + Math.min(carbsGap, meal.carbs) * .25 + Math.min(fatGap, meal.fat) * .35 + quality;
      const reason = qualityGap?.percent < 60 && qualityGap.key === "fiber" && meal.tags.includes("סיבים") ? "מוסיפה מקור סיבים שחסר היום" : qualityGap?.percent < 60 && qualityGap.key === "produce" && (meal.tags.includes("ירקות") || meal.tags.includes("פירות")) ? "עוזרת להשלים ירקות ופירות" : proteinGap > 20 && meal.protein >= 25 ? `משלימה כ־${meal.protein}g חלבון מהחוסר היומי` : carbsGap > 35 && meal.carbs >= 35 ? "מתאימה לחוסר הנוכחי בפחמימות" : "מאוזנת ביחס למה שנאכל עד עכשיו";
      return { ...meal, rank: preference + nutrition, reason, personal: meal.tags.some((tag) => likes.includes(tag)) };
    }).sort((a, b) => b.rank - a.rank);
    const daySeed = Number(String(state?.today?.date || "").replaceAll("-", "")) || 0; const offset = ranked.length ? (daySeed + suggestionRefresh * 3) % ranked.length : 0;
    return [...ranked.slice(offset), ...ranked.slice(0, offset)].slice(0, 3);
  }, [profile, macros, suggestionPeriod, suggestionRefresh, state?.dailyScore?.parameters, state?.today?.date]);
  const historyDays = useMemo(() => [...(state?.history || []), ...(state?.today ? [{ ...state.today, dailyScore: state.dailyScore }] : [])], [state?.history, state?.today, state?.dailyScore]);
  const currentMealPeriod = now.getHours() < 11 ? "breakfast" : now.getHours() < 15 ? "lunch" : now.getHours() < 19 ? "snack" : "dinner";
  const quickRepeatMeals = useMemo(() => {
    const recentMeals = [...(state?.history || [])].slice(-14).flatMap((day: any) => day.meals || []).filter((meal: any) => !meal.beverageEntry && Number(meal.kcal) > 0);
    const groups = new Map<string, { meal: any; count: number; latest: number }>();
    for (const meal of recentMeals) { const key = String(meal.name || "").toLocaleLowerCase("he").trim(); if (!key) continue; const existing = groups.get(key); const time = new Date(meal.time || 0).getTime(); if (!existing) groups.set(key, { meal, count: 1, latest: time }); else { existing.count += 1; if (time > existing.latest) { existing.meal = meal; existing.latest = time; } } }
    return [...groups.values()].sort((a, b) => (b.count + (b.meal.period === currentMealPeriod ? 2 : 0)) - (a.count + (a.meal.period === currentMealPeriod ? 2 : 0)) || b.latest - a.latest).slice(0, 4);
  }, [state?.history, currentMealPeriod]);
  const activeHistoryDate = historySelectedDate || state?.today?.date || "";
  const activeHistoryDay = historyDays.find((day) => day.date === activeHistoryDate) || historyDays[0];
  const activeCalendarMonth = historyCalendarMonth || activeHistoryDate.slice(0, 7);
  const calendarCells = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(activeCalendarMonth)) return [];
    const [year, month] = activeCalendarMonth.split("-").map(Number);
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => `${activeCalendarMonth}-${String(index + 1).padStart(2, "0")}`)];
  }, [activeCalendarMonth]);
  const moveHistoryMonth = (amount: number) => {
    const [year, month] = activeCalendarMonth.split("-").map(Number);
    const next = new Date(year, month - 1 + amount, 1);
    setHistoryCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };
  const usage = useMemo(
    () =>
      state?.aiUsage?.reduce((sum, item) => sum + Number(item.cost || 0), 0) ||
      0,
    [state],
  );
  const isAdmin = state?.currentUser?.role === "admin";
  const storedWeightEntries = state?.measurements || [];
  const initialWeight = Number(profile?.initialWeight || 0);
  const weightEntries = initialWeight > 0 && (!storedWeightEntries.length || Number(storedWeightEntries[0]?.weight) !== initialWeight)
    ? [{ id: "initial-weight", date: String(profile?.completedAt || state?.today?.date || "").slice(0, 10), weight: initialWeight, initial: true }, ...storedWeightEntries]
    : storedWeightEntries;
  const latestWeight = weightEntries.at(-1)?.weight || profile?.weight || 0;
  const previousWeight = weightEntries.length > 1 ? Number(weightEntries.at(-2)?.weight) : null;
  const latestWeightDelta = previousWeight === null ? null : Number((Number(latestWeight) - previousWeight).toFixed(1));
  const targetWeight = Number(profile?.targetWeight || 0);
  const weightGoalDistance = Math.abs(targetWeight - initialWeight);
  const weightGoalProgress = weightGoalDistance > 0 ? Math.max(0, Math.min(100, Math.round(Math.abs(Number(latestWeight) - initialWeight) / weightGoalDistance * 100))) : 0;
  const weightChange =
    weightEntries.length > 1
      ? Number(
          (weightEntries.at(-1).weight - weightEntries[0].weight).toFixed(1),
        )
      : 0;
  const visibleWeightEntries = weightEntries.slice(-12);
  const weightRange = visibleWeightEntries.length ? { min: Math.min(...visibleWeightEntries.map((item: any) => Number(item.weight))), max: Math.max(...visibleWeightEntries.map((item: any) => Number(item.weight))) } : { min: 0, max: 0 };
  const weightChartPoints = visibleWeightEntries.map((item: any, index: number) => {
    const x = visibleWeightEntries.length === 1 ? 300 : 24 + index * (552 / (visibleWeightEntries.length - 1));
    const spread = Math.max(1, weightRange.max - weightRange.min);
    const y = 136 - ((Number(item.weight) - weightRange.min) / spread) * 104;
    return { ...item, x, y };
  });
  const hydrationCatalog = [...HYDRATION_BEVERAGES, ...(profile?.customHydrationBeverages || []).map(normalizeCustomBeverage)];
  const hydrationTrendDayCount = hydrationTrendPeriod === "day" ? 1 : hydrationTrendPeriod === "week" ? 7 : 30;
  const hydrationTrendLabel = hydrationTrendPeriod === "day" ? "היום" : hydrationTrendPeriod === "week" ? "7 הימים האחרונים" : "30 הימים האחרונים";
  const hydrationTrendDays = [...historyDays].sort((a: any, b: any) => String(a.date).localeCompare(String(b.date))).slice(-hydrationTrendDayCount);
  const waterByHour = Array.from({ length: 24 }, (_, hour) => ({ hour, amount: hydrationTrendDays.flatMap((day: any) => day.waterEvents || []).filter((event: any) => new Date(event.time).getHours() === hour).reduce((sum: number, event: any) => sum + Number(event.amount || 0), 0) }));
  const maximumWaterHour = Math.max(1, ...waterByHour.map((item) => item.amount));
  const hydrationTrendEvents = hydrationTrendDays.flatMap((day: any) => day.waterEvents || []);
  const hydrationTrendLayers = hydrationCatalog.map((beverage) => ({ ...beverage, amount: hydrationTrendEvents.filter((event: any) => (event.beverageId || "water") === beverage.id).reduce((sum: number, event: any) => sum + Number(event.hydrationMl ?? event.amount ?? 0), 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const hydrationTrendTotal = hydrationTrendLayers.reduce((sum, item) => sum + item.amount, 0);
  const trend30Days = insightsData?.daily?.slice(-30) || [];
  const trend30Points = trend30Days.map((day: any, index: number) => ({
    ...day,
    x: trend30Days.length === 1 ? 300 : 24 + index * (552 / Math.max(1, trend30Days.length - 1)),
    y: 142 - Math.max(0, Math.min(100, Number(day.score || 0))) * 1.12,
  }));
  const trend30Line = trend30Points.map((point: any) => `${point.x},${point.y}`).join(" ");
  const trend30Area = trend30Points.length ? `24,150 ${trend30Line} ${trend30Points.at(-1).x},150` : "";
  const greeting =
    now.getHours() < 5
      ? "לילה טוב"
      : now.getHours() < 12
        ? "בוקר טוב"
        : now.getHours() < 17
          ? "צהריים טובים"
          : now.getHours() < 21
            ? "ערב טוב"
            : "לילה טוב";
  const waterRemaining = Math.max(
    0,
    Number(profile?.waterMl || 0) - Number(state?.today?.waterMl || 0),
  );
  const hydrationRows = [HYDRATION_BEVERAGES[0], ...hydrationCatalog.filter((item) => !item.fixed && (profile?.hydrationBeverages || []).includes(item.id))].map((beverage) => {
    const events = (state?.today?.waterEvents || []).filter((event: any) => (event.beverageId || "water") === beverage.id);
    const amount = events.length ? events.reduce((sum: number, event: any) => sum + Number(event.amount || 0), 0) : beverage.id === "water" && !(state?.today?.waterEvents || []).length ? Number(state?.today?.waterMl || 0) : 0;
    const contribution = events.length ? events.reduce((sum: number, event: any) => sum + Number(event.hydrationMl ?? event.amount ?? 0), 0) : amount;
    const removableAmount = events.filter((event: any) => !event.inferredFromHistory && !event.sourceMealId).reduce((sum: number, event: any) => sum + Number(event.amount || 0), 0);
    return { ...beverage, amount, contribution, removableAmount };
  });
  const dailyHydrationLayers = hydrationRows.filter((item) => item.contribution > 0).sort((a, b) => b.contribution - a.contribution);
  const dailyHydrationTotal = dailyHydrationLayers.reduce((sum, item) => sum + item.contribution, 0);
  const proteinRemaining = Math.max(
    0,
    Number(profile?.protein || 0) - macros.protein,
  );
  const dailyInsights = useMemo(() => {
    if (!profile) return [];
    const items: { icon: string; title: string; text: string; priority: number }[] = [];
    const parameter = (key: string) => (state?.dailyScore?.parameters || []).find((item: any) => item.key === key && item.available);
    const fiber = parameter("fiber"); const produce = parameter("produce");
    const hour = now.getHours();
    const dayProgress = Math.max(0, Math.min(1, (hour - 7) / 15));
    const waterProgress = Number(state?.today?.waterMl || 0) / Math.max(1, Number(profile.waterMl));
    const proteinProgress = macros.protein / Math.max(1, Number(profile.protein));
    const recommendationBucket = Number(String(state?.today?.date || "").replaceAll("-", "")) + Math.floor(hour / 3);
    const choose = (values: string[]) => values[Math.abs(recommendationBucket) % values.length];
    const nextMeal = hour < 11 ? "ארוחת הבוקר" : hour < 15 ? "ארוחת הצהריים" : hour < 19 ? "ארוחת הביניים או הערב" : "ארוחת הערב";
    if (waterRemaining >= 500 && waterProgress + .12 < dayProgress)
      items.push({
        icon: "💧",
        title: hour < 17 ? "קצב השתייה נמוך כרגע" : "כדאי להשלים שתייה בהדרגה",
        text: choose([`עד השעה הזו הגעת ל־${Math.round(waterProgress * 100)}% מיעד השתייה. כוס עכשיו ועוד אחת בהמשך יסגרו את הפער בנוחות.`, `נותרו ${waterRemaining.toLocaleString()} מ״ל. עדיף לפזר אותם עד הערב ולא להשלים הכול בבת אחת.`]),
        priority: Math.round((dayProgress - waterProgress) * 100) + 35,
      });
    if (proteinRemaining >= 20 && (proteinProgress + .15 < dayProgress || hour >= 16))
      items.push({
        icon: "◉",
        title: `כדאי לחזק חלבון ב${nextMeal}`,
        text: choose([`נשארו כ־${proteinRemaining} גרם ליעד. בחר מקור חלבון שאתה אוהב ושלב אותו בארוחה הקרובה.`, `הגעת ל־${Math.round(proteinProgress * 100)}% מיעד החלבון. פיזור החסר בין הארוחות יהיה נוח יותר מהשלמה מאוחרת.`]),
        priority: Math.round((1 - proteinProgress) * 100) + (hour >= 16 ? 20 : 0),
      });
    if (fiber && fiber.percent < 70) items.push({ icon: "◇", title: "אפשר לחזק את הסיבים", text: `נרשמו כ־${Math.round(fiber.value)} מתוך ${Math.round(fiber.target)} גרם. קטניות, ירקות, פרי או דגן מלא יעזרו.`, priority: 100 - fiber.percent + 7 });
    if (produce && produce.percent < 70) items.push({ icon: "✦", title: "עוד צבע בארוחה הבאה", text: `נרשמו כ־${Math.round(produce.value)} מתוך ${Math.round(produce.target)} גרם ירקות ופירות.`, priority: 100 - produce.percent + 5 });
    if (consumed > profile.calories)
      items.push({
        icon: "↗",
        title: "עברת את היעד היומי",
        text: `נצרכו ${consumed - profile.calories} קלוריות מעל היעד. יום אחד אינו קובע מגמה.`,
        priority: 90,
      });
    else if (remaining > profile.calories * 0.55 && now.getHours() >= 16)
      items.push({
        icon: "◷",
        title: "נשאר פער גדול להיום",
        text: `נותרו ${remaining.toLocaleString()} קלוריות. עדיף לתכנן ארוחה מאוזנת ולא להשלים בבת אחת.`,
        priority: 75,
      });
    if ((state?.today?.meals?.length || 0) === 0)
      items.push({
        icon: "◷",
        title: "התחלה פשוטה ליום",
        text: "הארוחה הראשונה לא צריכה להיות מושלמת — שלב חלבון, ירק או פרי ומקור אנרגיה.",
        priority: 85,
      });
    else
      items.push({
        icon: "✓",
        title: now.getHours() < 14 ? "תכנון קטן להמשך" : "שמור על רצף נוח",
        text: now.getHours() < 14 ? "מבט קצר על הפערים עכשיו יעזור לבחור את הארוחה הבאה בלי לנחש." : "עדיף לפזר את האכילה ולא להגיע לארוחה הבאה רעב מאוד.",
        priority: 25,
      });
    const journeyStage = profile.journey?.stage || "starting";
    const goal = profile.goal || "maintain";
    if (latestWeightDelta !== null) {
      const movingWithGoal = goal === "lose" ? latestWeightDelta < 0 : goal === "gain" ? latestWeightDelta > 0 : Math.abs(latestWeightDelta) <= .3;
      items.push({ icon: movingWithGoal ? "↗" : "◎", title: movingWithGoal ? "המגמה מתקדמת בכיוון היעד" : "מדידה אחת אינה סיבה לשנות מסלול", text: movingWithGoal ? `השינוי האחרון הוא ${Math.abs(latestWeightDelta).toFixed(1)} ק״ג בכיוון המתאים. שמור על עקביות לפני התאמה נוספת.` : `השינוי האחרון הוא ${latestWeightDelta > 0 ? "+" : ""}${latestWeightDelta.toFixed(1)} ק״ג. נבחן כמה מדידות ולא נגיב לתנודה בודדת.`, priority: 34 });
    } else if (journeyStage !== "starting") {
      items.push({ icon: "◎", title: "חסר מדד כדי להבין את התהליך", text: "מדידת משקל נוספת תאפשר להבדיל בין תחושה למגמה בלי לשנות את היעד מוקדם מדי.", priority: 32 });
    }
    const contextual = hour < 11
      ? [{ icon: "✦", title: "פתיחה שמתאימה להמשך היום", text: `ב${nextMeal} העדף שילוב שישאיר אותך שבע: חלבון, מקור סיבים ונוזלים.`, priority: 26 }]
      : hour < 16
        ? [{ icon: "◇", title: "בדיקת אמצע יום", text: `עד עכשיו נצרכו ${consumed.toLocaleString()} קלוריות. ${remaining > profile.calories * .55 ? "נשאר מרווח גדול — אין צורך לצמצם את ארוחת הצהריים." : "המשך לפי רעב ופזר את היתרה להמשך היום."}`, priority: 26 }]
        : hour < 21
          ? [{ icon: "◷", title: "תכנון הערב לפי מה שחסר", text: proteinRemaining >= 20 ? `בארוחה הקרובה עדיף לתת עדיפות לחלבון; נשארו כ־${proteinRemaining} גרם.` : "רוב יעדי היום מתקדמים. בחר ארוחה שמתאימה לרעב במקום להשלים מספרים בכוח.", priority: 26 }]
          : [{ icon: "✓", title: "סיכום רגוע לפני סיום היום", text: `תועדו ${state?.today?.meals?.length || 0} ארוחות ו־${Number(state?.today?.waterMl || 0).toLocaleString()} מ״ל מים. מחר נשתמש בדפוס הזה כדי לדייק את ההמלצה.`, priority: 26 }];
    items.push(...contextual);
    if (!items.length)
      items.push({
        icon: "✓",
        title: "אתה בקצב מאוזן",
        text: "המשך לעדכן ארוחות ושתייה כדי לקבל המלצה מדויקת יותר.",
        priority: 10,
      });
    return items.sort((a, b) => b.priority - a.priority);
  }, [profile, waterRemaining, proteinRemaining, consumed, remaining, now, state?.today?.meals?.length, state?.today?.date, state?.today?.waterMl, state?.dailyScore?.parameters, macros.protein, latestWeightDelta]);
  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/session", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      const latest = await api("/api/state");
      setState(latest);
      if (latest.owner)
        setOnboarding((current) => ({
          ...current,
          name: latest.owner.name,
          email: latest.owner.email,
        }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminData() {
    const [users, aiData, health, backups, audit, storage, database] = await Promise.all([
      api("/api/admin/users"),
      api("/api/ai/settings"),
      api("/api/admin/health"),
      api("/api/admin/backups"),
      api("/api/admin/audit"),
      api("/api/admin/storage"),
      api("/api/admin/database"),
    ]);
    setAdminUsers(users);
    setModelCatalog(aiData.models);
    setImageModelCatalog(aiData.imageModels || { openai: [], gemini: [] });
    setAdminHealth(health);
    setAdminBackups(backups.backups || []);
    setAdminAudit(audit.items || []);
    setStorageForm(storage.settings);
    setStorageStatus(storage.status);
    setStoragePendingMedia(storage.pendingMedia || 0);
    setDatabaseStatus(database);
    const available = aiData.models[aiData.settings.provider] || [];
    const selected =
      available.find((item: any) => item.id === aiData.settings.model) ||
      available[0];
    setAiForm((current) => ({
      ...current,
      ...aiData.settings,
      coachModel: aiData.settings.roles?.coach?.model || selected?.id,
      visionModel: aiData.settings.roles?.vision?.model || selected?.id,
      coachFallbackModel: aiData.settings.roles?.coach?.fallbackModel || "",
      visionFallbackModel: aiData.settings.roles?.vision?.fallbackModel || "",
      imageFallbackModel: aiData.settings.roles?.image?.fallbackModel || "",
      imageModel:
        aiData.settings.roles?.image?.model ||
        aiData.imageModels?.[aiData.settings.provider]?.[0]?.id,
      ...(selected
        ? {
            model: selected.id,
            inputCost: selected.inputCost,
            outputCost: selected.outputCost,
          }
        : {}),
      apiKey: "",
    }));
  }

  async function createBackup() {
    setBusy(true);
    try {
      const data = await api("/api/admin/backups", { method: "POST", body: JSON.stringify({ type: backupType }) });
      setAdminBackups(data.backups || []);
      setAiStatus("הגיבוי נוצר ואומת ✓");
      await loadAdminData();
    } catch (e) {
      setAiStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function restoreBackup(name: string) {
    if (
      !window.confirm(
        "לשחזר את הגיבוי? המערכת תיצור קודם Safety Backup והמצב הנוכחי יוחלף.",
      )
    )
      return;
    setBusy(true);
    try {
      await api("/api/admin/backups", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setAiStatus("השחזור הושלם. טוען מחדש…");
      window.setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setAiStatus((e as Error).message);
      setBusy(false);
    }
  }
  async function saveStorage() {
    setBusy(true);
    setAiStatus("");
    try {
      await api("/api/admin/storage", {
        method: "PATCH",
        body: JSON.stringify(storageForm),
      });
      const latest = await api("/api/admin/storage");
      setStorageForm(latest.settings);
      setStorageStatus(latest.status);
      setAiStatus("יעדי האחסון נשמרו ונבדקה הרשאת כתיבה ✓");
    } catch (e) {
      setAiStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function syncStorage() {
    setBusy(true);
    try {
      const result = await api("/api/admin/storage", { method: "POST" });
      setStoragePendingMedia(Math.max(0, storagePendingMedia - Number(result.synced || 0)));
      setAiStatus(`${result.synced || 0} קובצי מדיה סונכרנו ליעד הקבוע ✓`);
      await loadAdminData();
    } catch (e) { setAiStatus((e as Error).message); }
    finally { setBusy(false); }
  }

  async function maintainDatabase(action: "integrity" | "optimize") {
    setBusy(true);
    try {
      await api("/api/admin/database", { method: "POST", body: JSON.stringify({ action }) });
      setDatabaseStatus(await api("/api/admin/database"));
      setAiStatus(action === "integrity" ? "בדיקת שלמות מסד הנתונים הסתיימה ✓" : "מסד הנתונים נותח ומוטב ✓");
    } catch (e) { setAiStatus((e as Error).message); }
    finally { setBusy(false); }
  }

  async function openAdmin() {
    closeOpenScreens();
    if (isAdmin) {
      setSettingsOpen(true);
      loadAdminData().catch((e) => setError(e.message));
    } else setAdminLoginOpen(true);
  }

  async function loginAdmin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/admin", {
        method: "POST",
        body: JSON.stringify({ password: adminPassword }),
      });
      const latest = await api("/api/state");
      setState(latest);
      setAiForm((current) => ({ ...current, ...latest.ai, apiKey: "" }));
      setAdminPassword("");
      setAdminLoginOpen(false);
      setSettingsOpen(true);
      await loadAdminData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setAiStatus("");
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      setNewUser({ name: "", email: "", password: "" });
      setAdminUsers(await api("/api/admin/users"));
      setAiStatus("המשתמש נוצר ויכול להתחבר ✓");
    } catch (e) {
      setAiStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finishOnboarding() {
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({ ...onboarding, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      setState(data);
      setDark(onboarding.theme === "dark");
      setAiForm((current) => ({ ...current, ...data.ai, apiKey: "" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addWater(amount = 250, beverageId = "water") {
    if (waterMutationInFlight.current) return;
    waterMutationInFlight.current = true;
    try {
      const recordedAt = new Date().toISOString();
      const localDate = profile?.dayBoundaryMode === "manual" ? state.today.date : clientLocalDate(new Date(), profile?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      const mutationKey = crypto.randomUUID();
      if (!navigator.onLine) {
        await queueMutation("/api/water", "POST", JSON.stringify({ amount, beverageId, recordedAt, localDate }));
        setState((current: any) => {
          const waterEvents = [...(current.today.waterEvents || [])];
          let meals = [...(current.today.meals || [])];
          const custom = current.profile?.customHydrationBeverages || []; const beverage = hydrationBeverage(beverageId, custom);
          if (amount > 0) {
            const eventId = `offline-${mutationKey}`; const nutrition = beverageNutrition(amount, beverage.id, custom); const mealId = nutrition.kcal > 0 ? `${eventId}-meal` : null;
            waterEvents.push({ id: eventId, amount, hydrationMl: hydrationContribution(amount, beverage.id, custom), beverageId: beverage.id, beverageName: beverage.name, icon: beverage.icon, source: "hydration-control", ...(mealId ? { mealId } : {}), time: recordedAt, pendingSync: true });
            if (mealId) meals.push({ id: mealId, hydrationEventId: eventId, beverageEntry: true, name: beverage.name, period: "snack", ...nutrition, sugar: 0, items: [{ name: beverage.name, grams: amount, quantity: 1, kcalPer100: beverage.kcalPer100, proteinPer100: beverage.proteinPer100, carbsPer100: beverage.carbsPer100, fatPer100: beverage.fatPer100 }], source: "manual", confidence: .9, time: recordedAt, logicalDate: localDate, pendingSync: true });
          } else { const draftDay = { waterEvents, meals, waterMl: current.today.waterMl }; removeLatestBeverageServing(draftDay, beverage.id, Math.abs(amount), custom); meals = draftDay.meals; waterEvents.splice(0, waterEvents.length, ...draftDay.waterEvents); }
          return { ...current, today: { ...current.today, date: localDate, waterMl: hydrationTotal(waterEvents), waterEvents, meals } };
        });
        setOfflineQueueCount(await offlinePendingCount()); setMealResult({ name: "השתייה נשמרה במכשיר וממתינה לסנכרון", kcal: 0, protein: 0, carbs: 0, fat: 0 }); return;
      }
      setState(
        await api("/api/water", {
          method: "POST",
          headers: { "Idempotency-Key": mutationKey },
          body: JSON.stringify({ amount, beverageId, recordedAt, localDate }),
        }),
      );
      if (amount > 0) { const beverage = hydrationBeverage(beverageId, profile?.customHydrationBeverages || []); setMealResult({ name: `${amount} מ״ל ${beverage.name} נוספו`, kcal: 0, protein: 0, carbs: 0, fat: 0 }); setRecentUndo({ kind: "water", name: beverage.name, amount, beverageId }); }
    } catch (e) {
      setError((e as Error).message);
    } finally { waterMutationInFlight.current = false; }
  }
  async function finishActiveDay() {
    if (!navigator.onLine) { setError("כדי לסיים יום ידנית נדרש חיבור לרשת, כדי שההיסטוריה והציון יישמרו בשלמותם."); return; }
    setBusy(true);
    try {
      const latest = await api("/api/day", { method: "POST" });
      setState(latest);
      setDayCloseConfirm(false);
      setMealResult({ name: "היום נשמר בהיסטוריה והתחיל יום פעיל חדש", kcal: 0, protein: 0, carbs: 0, fat: 0 });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function openWaterEditor() {
    setWaterValue(Number(state?.today?.waterMl || 0));
    setWaterTargetValue(Number(profile?.waterMl || 2000));
    setSelectedHydrationBeverages(Array.isArray(profile?.hydrationBeverages) ? profile.hydrationBeverages : []);
    setCustomHydrationBeverages(Array.isArray(profile?.customHydrationBeverages) ? profile.customHydrationBeverages.map(normalizeCustomBeverage) : []);
    setCustomBeverageOpen(false);
    setWaterOpen(true);
  }
  function addCustomBeverage() {
    if (!customBeverageDraft.name.trim()) { setError("יש לתת שם למשקה המותאם"); return; }
    const beverage = normalizeCustomBeverage({ ...customBeverageDraft, id: `custom_${crypto.randomUUID()}` });
    setCustomHydrationBeverages((current) => [...current, beverage]);
    setSelectedHydrationBeverages((current) => [...current, beverage.id]);
    setCustomBeverageDraft({ name: "", defaultAmount: 250, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0, factor: .9 });
    setCustomBeverageOpen(false);
  }
  async function saveWater() {
    setBusy(true);
    try {
      if (!navigator.onLine) {
        await queueMutation("/api/water", "PUT", JSON.stringify({ targetWaterMl: waterTargetValue, beverages: selectedHydrationBeverages, customBeverages: customHydrationBeverages, localDate: state.today.date }));
        setState((current: any) => ({ ...current, profile: { ...current.profile, waterMl: waterTargetValue, hydrationBeverages: selectedHydrationBeverages, customHydrationBeverages } }));
        setOfflineQueueCount(await offlinePendingCount()); setWaterOpen(false); return;
      }
      setState(
        await api("/api/water", {
          method: "PUT",
          body: JSON.stringify({ targetWaterMl: waterTargetValue, beverages: selectedHydrationBeverages, customBeverages: customHydrationBeverages }),
        }),
      );
      setWaterOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function closeOpenScreens() {
    setCoachOpen(false); setSettingsOpen(false); setAdminLoginOpen(false); setMealOpen(false); setQuickAddOpen(false);
    setWaterOpen(false); setProfileOpen(false); setHistoryOpen(false); setInsightsOpen(false); setActivityOpen(false);
    setVoiceOpen(false); setPartnerOpen(false); setCustomFoodOpen(false); setFoodLibraryOpen(false); setTasteWizardOpen(false);
    setForgottenOpen(false);
    setNewCycleOpen(false);
    setDayCloseConfirm(false);
    setSyncCenterOpen(false);
    setMacroDetail(""); setMealPreview(null); setPendingQuickFood(null); setEditingFood(null);
  }
  function openNavigationScreen(screen: "home" | "history" | "admin" | "insights" | "coach") {
    closeOpenScreens();
    if (screen === "history") setHistoryOpen(true);
    if (screen === "admin") void openAdmin();
    if (screen === "insights") void openInsights();
    if (screen === "coach") setCoachOpen(true);
  }

  function dictateManualDescription() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setMealOpen(false); setVoiceOpen(true); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "he-IL"; recognition.interimResults = false; recognition.maxAlternatives = 1;
    setPhotoStatus("מקשיב… אפשר לתאר את הארוחה עכשיו.");
    recognition.onresult = (event: any) => { const text = event.results?.[0]?.[0]?.transcript || ""; setManualDescription((current) => `${current} ${text}`.trim()); setPhotoStatus("ההכתבה נוספה. אפשר לתקן או לחשב עם AI."); };
    recognition.onerror = () => setPhotoStatus("לא הצלחתי לקלוט את ההכתבה. אפשר לנסות שוב או להקליד.");
    recognition.start();
  }
  async function openInsights() {
    setInsightsData(null);
    setInsightsOpen(true);
    setWeightValue(Number(latestWeight || 0));
    setWeightDate(state?.today?.date || new Date().toISOString().slice(0, 10));
    setWeightFeedback("");
    try {
      const [insights, goalPlan] = await Promise.all([api("/api/insights"), api("/api/goal-plan")]);
      setInsightsData({ ...insights, goalPlan });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function acceptGoalAdjustment() {
    if (!insightsData?.goalPlan?.proposal || busy) return;
    setBusy(true);
    try { const latest = await api("/api/goal-plan", { method: "POST" }); setState(latest); const [insights, goalPlan] = await Promise.all([api("/api/insights"), api("/api/goal-plan")]); setInsightsData({ ...insights, goalPlan }); setWeightFeedback("ההתאמה נשמרה. המנוע ימתין לפחות 14 ימים לפני בדיקה נוספת."); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function saveTrendWeight(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setWeightFeedback("");
    if (!(Number(weightValue) >= 25 && Number(weightValue) <= 350)) { setWeightFeedback("יש להזין משקל בין 25 ל־350 ק״ג."); return; }
    setBusy(true);
    try {
      if (!navigator.onLine) {
        await queueMutation("/api/measurements", "POST", JSON.stringify({ weight: Number(weightValue), date: weightDate }));
        setState((current: any) => ({ ...current, profile: { ...current.profile, weight: Number(weightValue) }, measurements: [...(current.measurements || []).filter((item: any) => item.date !== weightDate), { id: `offline-${crypto.randomUUID()}`, date: weightDate, weight: Number(weightValue), at: new Date().toISOString(), pendingSync: true }] }));
        setOfflineQueueCount(await offlinePendingCount()); setWeightFeedback(`המשקל נשמר במכשיר ויסונכרן כשהחיבור יחזור.`); return;
      }
      const latest = await api("/api/measurements", { method: "POST", body: JSON.stringify({ weight: Number(weightValue), date: weightDate }) });
      setState(latest);
      setInsightsData(await api("/api/insights"));
      setWeightFeedback(`המשקל ${Number(weightValue).toFixed(1)} ק״ג נשמר בתאריך ${weightDate}. ההיסטוריה עודכנה.`);
    } catch (e) {
      setWeightFeedback(`העדכון לא נשמר: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }
  async function addActivity(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (!navigator.onLine) {
        const recordedAt = new Date().toISOString();
        const localId = `offline-${crypto.randomUUID()}`;
        await queueMutation("/api/activity", "POST", JSON.stringify({ ...activityForm, recordedAt, localDate: state.today.date }));
        setState((current: any) => ({ ...current, activity: [...(current.activity || []), { ...activityForm, id: localId, date: current.today.date, time: recordedAt, pendingSync: true }] }));
        setOfflineQueueCount(await offlinePendingCount()); setActivityOpen(false); return;
      }
      const latest = await api("/api/activity", {
          method: "POST",
          body: JSON.stringify(activityForm),
        });
      setState(latest);
      const added = [...(latest.activity || [])].reverse().find((item: any) => item.type === activityForm.type);
      if (added?.id) { setMealResult({ name: `${activityForm.type} נוספה`, kcal: 0, protein: 0, carbs: 0, fat: 0 }); setRecentUndo({ kind: "activity", id: added.id, name: activityForm.type }); }
      setActivityOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openTrash() {
    setAdminTab("trash");
    setSettingsOpen(true);
    try {
      const data = await api("/api/trash");
      setTrashItems(data.items);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function restoreTrash(id: string) {
    try {
      setState(
        await api("/api/trash", {
          method: "PATCH",
          body: JSON.stringify({ id }),
        }),
      );
      setTrashItems((items) => items.filter((item) => item.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function permanentlyDeleteTrash(id: string) {
    if (!window.confirm("למחוק את הפריט לצמיתות? לא ניתן לשחזר פעולה זו.")) return;
    try {
      await api("/api/trash", { method: "DELETE", body: JSON.stringify({ id }) });
      setTrashItems((items) => items.filter((item) => item.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function emptyTrash() {
    if (!trashItems.length || !window.confirm(`למחוק לצמיתות את כל ${trashItems.length} הפריטים בסל? לא ניתן לשחזר אותם לאחר מכן.`)) return;
    try {
      await api("/api/trash", { method: "DELETE", body: JSON.stringify({ all: true }) });
      setTrashItems([]);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function addMeal(event: FormEvent) {
    event.preventDefault();
    if (busy || mealSaveInFlight.current) return;
    setError("");
    const completedFields: string[] = [];
    const normalizedItems = mealItems
      .filter((item) => item.name || item.searchNameEn || item.grams || item.kcalPerUnit || item.kcalPer100 || item.proteinPer100 || item.carbsPer100 || item.fatPer100)
      .map((item) => {
        const next = { ...item };
        if (!String(next.name || "").trim() && String(next.searchNameEn || "").trim()) { next.name = String(next.searchNameEn).trim(); completedFields.push("שם פריט"); }
        if (!(Number(next.quantity) > 0)) { next.quantity = 1; completedFields.push(`כמות עבור ${next.name || "פריט"}`); }
        if (!(Number(next.kcalPerUnit) > 0) && !(Number(next.kcalPer100) > 0)) {
          const macroCalories = Number(next.proteinPer100 || 0) * 4 + Number(next.carbsPer100 || 0) * 4 + Number(next.fatPer100 || 0) * 9;
          if (macroCalories > 0) { next.kcalPer100 = Math.round(macroCalories); completedFields.push(`קלוריות עבור ${next.name || "פריט"}`); }
        }
        return next;
      });
    const inferredName = normalizedItems.map((item) => String(item.name || "").trim()).filter(Boolean).slice(0, 3).join(" · ") || manualDescription.trim();
    const normalizedForm = { ...mealForm };
    if (!String(normalizedForm.name || "").trim() && inferredName) { normalizedForm.name = inferredName.slice(0, 120); completedFields.push("שם הארוחה"); }
    if (!normalizedItems.length && !(Number(normalizedForm.kcal) > 0)) {
      const macroCalories = Number(normalizedForm.protein || 0) * 4 + Number(normalizedForm.carbs || 0) * 4 + Number(normalizedForm.fat || 0) * 9;
      if (macroCalories > 0) { normalizedForm.kcal = Math.round(macroCalories); completedFields.push("קלוריות לפי רכיבי המאקרו"); }
    }
    let normalizedDateTime = mealDateTime;
    if (!normalizedDateTime || !Number.isFinite(new Date(normalizedDateTime).getTime())) { normalizedDateTime = localDateTimeInput(); completedFields.push("תאריך ושעה"); }
    const validationErrors: Record<string, string> = {};
    if (!String(normalizedForm.name || "").trim()) validationErrors.name = "יש להזין שם לארוחה";
    normalizedItems.forEach((item, index) => {
      if (!String(item.name || "").trim()) validationErrors[`item-name-${index}`] = `חסר שם בפריט ${index + 1}`;
      if (!(Number(item.grams) > 0)) validationErrors[`item-grams-${index}`] = `חסר משקל בגרם עבור ${item.name || `פריט ${index + 1}`}`;
      if (!(Number(item.kcalPerUnit) > 0) && !(Number(item.kcalPer100) > 0)) validationErrors[`item-kcal-${index}`] = `חסר ערך קלורי ליחידה או ל־100 גרם עבור ${item.name || `פריט ${index + 1}`}`;
    });
    if (!normalizedItems.length && !(Number(normalizedForm.kcal) > 0)) validationErrors.kcal = "חסרה כמות הקלוריות של הארוחה";
    setMealForm(normalizedForm);
    setMealItems(normalizedItems);
    setMealDateTime(normalizedDateTime);
    setMealValidationErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setMealSaveFeedback(`${completedFields.length ? `השלמנו אוטומטית: ${[...new Set(completedFields)].join(", ")}. ` : ""}כדי לשמור צריך להשלים: ${Object.values(validationErrors).join("; ")}.`);
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-meal-field="${Object.keys(validationErrors)[0]}"]`)?.focus());
      return;
    }
    const duplicateKey = `${String(normalizedForm.name).trim().toLocaleLowerCase("he")}|${normalizedDateTime.slice(0, 16)}`;
    const possibleDuplicate = !editingMealId && findPossibleDuplicate(state.today.meals || [], { name: normalizedForm.name, time: normalizedDateTime });
    if (possibleDuplicate && duplicateMealApproval.current !== duplicateKey) {
      duplicateMealApproval.current = duplicateKey;
      setMealSaveFeedback(`כבר הוספת “${possibleDuplicate.name}” לפני זמן קצר. אם זו מנה נוספת, לחץ שוב על אישור והוספה.`);
      return;
    }
    const reviewCalculation = calculateMealDraft(normalizedItems, normalizedForm);
    setMealForm({ ...normalizedForm, kcal: Math.round(reviewCalculation.kcal), protein: Math.round(reviewCalculation.protein), carbs: Math.round(reviewCalculation.carbs), fat: Math.round(reviewCalculation.fat) });
    setMealReviewReady(true);
    setMealSaveFeedback(completedFields.length ? `הושלמו אוטומטית: ${[...new Set(completedFields)].join(", ")}. שומר כעת…` : "שומר כעת…");
    mealSaveInFlight.current = true;
    setBusy(true);
    try {
      const calculated = calculateMealDraft(normalizedItems, normalizedForm);
      const finalMeal = {
        ...normalizedForm,
        portion: manualPortion.trim(),
        period: mealPeriod,
        occurredAt: new Date(normalizedDateTime).toISOString(),
        kcal: Math.round(calculated.kcal),
        protein: Math.round(calculated.protein),
        carbs: Math.round(calculated.carbs),
        fat: Math.round(calculated.fat),
        items: normalizedItems,
        aiOriginalItems,
        source: mealSource,
        transcript: mealTranscript,
        image: photoPreview,
        analysisJobId,
        confidence: mealConfidence === "high" ? .9 : mealConfidence === "medium" ? .7 : .45,
        recognitionScore: ["photo", "voice"].includes(mealSource) ? mealRecognitionScore : null,
        nutritionReliability: mealReliabilityPreview,
        interactionDurationMs: Math.max(0, Date.now() - mealInteractionStartedAt.current),
        userEdited: aiOriginalItems.length > 0 && JSON.stringify(aiOriginalItems) !== JSON.stringify(normalizedItems),
      };
      let latest: AppState = state;
      let savedMealId = editingMealId;
      let savedLocalDate = "";
      if (!catalogOnly) {
        if (!editingMealId && !mealSaveRequestId.current) mealSaveRequestId.current = crypto.randomUUID();
        const requestId = mealSaveRequestId.current || crypto.randomUUID();
        const payload = editingMealId ? { ...finalMeal, id: editingMealId, baseUpdatedAt: mealEditBaseUpdatedAt.current } : { ...finalMeal, clientRequestId: requestId, allowDuplicate: duplicateMealApproval.current === duplicateKey };
        if (!navigator.onLine) {
          await queueMutation("/api/meals", editingMealId ? "PATCH" : "POST", JSON.stringify(payload), requestId);
          savedMealId = editingMealId || `offline-${requestId}`; savedLocalDate = profile.dayBoundaryMode === "manual" ? state.today.date : normalizedDateTime.slice(0, 10);
          const optimisticMeal = { ...finalMeal, id: savedMealId, clientRequestId: requestId, time: finalMeal.occurredAt, pendingSync: true };
          latest = structuredClone(state);
          if (savedLocalDate === latest.today.date) latest.today.meals = editingMealId ? latest.today.meals.map((meal: any) => meal.id === editingMealId ? optimisticMeal : meal) : [...latest.today.meals, optimisticMeal];
          else { const day = latest.history.find((item: any) => item.date === savedLocalDate); if (day) day.meals = [...day.meals, optimisticMeal]; else latest.history.push({ date: savedLocalDate, waterMl: 0, meals: [optimisticMeal] }); }
          setOfflineQueueCount(await offlinePendingCount());
        } else {
          const saved = await api("/api/meals", { method: editingMealId ? "PATCH" : "POST", headers: { "Idempotency-Key": requestId }, body: JSON.stringify(payload) });
          savedMealId = saved.savedMealId || savedMealId; savedLocalDate = saved.savedLocalDate || ""; latest = await api("/api/state");
          const persistedMeals = [latest.today, ...(latest.history || [])].flatMap((day: any) => day?.meals || []);
          if (!savedMealId || !persistedMeals.some((meal: any) => meal.id === savedMealId)) throw new Error("השמירה לא אומתה במסד הנתונים. הארוחה נשארה פתוחה כדי שלא תאבד — נסה שוב.");
        }
      }
      if (saveToLibrary || catalogOnly) {
        await api("/api/foods", {
          method: "POST",
          body: JSON.stringify({
            ...finalMeal,
            category: foodCategory,
            visibility: foodVisibility,
            image: generateFoodArtwork ? "" : photoPreview,
            generateImage: generateFoodArtwork,
          }),
        });
        latest = await api("/api/state");
      }
      if (!catalogOnly && saveAsFavorite && savedMealId) {
        const favoritePayload = { mealId: savedMealId, meal: { name: finalMeal.name, kcal: finalMeal.kcal, protein: finalMeal.protein, carbs: finalMeal.carbs, fat: finalMeal.fat } };
        if (navigator.onLine) latest = await api("/api/favorites", { method: "POST", body: JSON.stringify(favoritePayload) });
        else {
          await queueMutation("/api/favorites", "POST", JSON.stringify(favoritePayload));
          latest.favorites = latest.favorites || [];
          if (!latest.favorites.some((item: any) => item.meal?.name === finalMeal.name)) latest.favorites.push({ id: `offline-favorite-${savedMealId}`, createdAt: new Date().toISOString(), meal: favoritePayload.meal, pendingSync: true });
          setOfflineQueueCount(await offlinePendingCount());
        }
      }
      setState(latest);
      if (!catalogOnly) setMealResult({ name: navigator.onLine ? finalMeal.name : `${finalMeal.name} · ממתין לסנכרון`, kcal: finalMeal.kcal, protein: finalMeal.protein, carbs: finalMeal.carbs, fat: finalMeal.fat, edited: Boolean(editingMealId), favoriteSaved: saveAsFavorite });
      if (navigator.onLine && !catalogOnly && !editingMealId && savedMealId) setRecentUndo({ kind: "meal", id: savedMealId, name: finalMeal.name });
      if (!catalogOnly && !editingMealId && savedLocalDate === latest.today?.date && consumed + Number(finalMeal.kcal) > dailyCalorieTarget) {
        setCalorieOverage({ id: savedMealId, meal: finalMeal, overBy: consumed + Number(finalMeal.kcal) - dailyCalorieTarget });
        if (notificationPermission === "granted") new Notification("CALOREAZI", { body: `חריגה של ${Math.round(consumed + Number(finalMeal.kcal) - dailyCalorieTarget)} קלוריות. אפשר לערוך או לבטל את ההוספה.` });
      }
      if (!catalogOnly && savedMealId && !photoPreview) void api("/api/meals/image", { method: "POST", body: JSON.stringify({ id: savedMealId, allowGenerate: state?.ai?.autoGenerateMealImages === true && state?.ai?.economyMode === false }) }).then((imageState) => { setState(imageState); if (imageState.imageCompleted) setMealResult((current: any) => current ? { ...current, imageCompleted: true } : current); }).catch(() => undefined);
      if (!catalogOnly && savedLocalDate && savedLocalDate !== latest.today?.date)
        setError(`הארוחה נשמרה בהיסטוריה בתאריך ${savedLocalDate}, בהתאם לשעה שנבחרה.`);
      setMealOpen(false);
      mealSaveRequestId.current = "";
      setEditingMealId("");
      mealEditBaseUpdatedAt.current = "";
      setMealForm({ name: "", kcal: 0, protein: 0, carbs: 0, fat: 0 });
      setMealItems([]);
      setAiOriginalItems([]);
      setMealSource("manual");
      setMealTranscript("");
      setAnalysisJobId("");
      setPhotoPreview("");
      setPhotoStatus("");
      setAiCorrection("");
      setAiCorrectionStatus("");
      setPhotoQuality(null);
      setMealConfidence("low");
      setSaveToLibrary(false);
      setSaveAsFavorite(false);
      setFoodVisibility("private");
      setGenerateFoodArtwork(false);
      setMealPeriod("snack");
      setManualDescription("");
      setManualPortion("");
      setFoodCategory("meals");
      setManualAiMode(false);
      setCatalogOnly(false);
      setMealValidationErrors({});
      setMealSaveFeedback("");
      duplicateMealApproval.current = "";
    } catch (e) {
      const message = (e as Error).message;
      setMealSaveFeedback(`השמירה לא הושלמה: ${message}`);
      setError(message);
    } finally {
      mealSaveInFlight.current = false;
      setBusy(false);
    }
  }
  async function repeatRecentMeal(meal: any) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const clientRequestId = crypto.randomUUID(); const occurredAt = new Date().toISOString();
      const payload = { name: meal.name, period: currentMealPeriod, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, sugar: meal.sugar, items: meal.items || [], source: "manual", confidence: .95, occurredAt, clientRequestId, allowDuplicate: true };
      if (!navigator.onLine) {
        await queueMutation("/api/meals", "POST", JSON.stringify(payload), clientRequestId);
        const optimistic = { ...payload, id: `offline-${clientRequestId}`, time: occurredAt, pendingSync: true };
        setState((current: any) => ({ ...current, today: { ...current.today, meals: [...current.today.meals, optimistic] } }));
        setOfflineQueueCount(await offlinePendingCount());
      } else setState(await api("/api/meals", { method: "POST", headers: { "Idempotency-Key": clientRequestId }, body: JSON.stringify(payload) }));
      setMealResult({ name: meal.name, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function deleteMeal(id: string) {
    try {
      const mealName =
        state?.today?.meals?.find((meal) => meal.id === id)?.name || "ארוחה";
      const latest = await api("/api/meals", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setState(latest);
      if (latest.undoId) setUndoMeal({ id: latest.undoId, name: mealName });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function performHistoryDelete(kind: "meal" | "water", id: string, date: string, password = "") {
    const confirmed = window.confirm(kind === "water" ? "למחוק את כוס המים הזו? כמות המים והציון של אותו יום יעודכנו מיד." : "למחוק את הארוחה ולעדכן מחדש את הקלוריות, אבות המזון והציון?");
    if (!confirmed) return;
    try {
      const latest = await api("/api/history", { method: "DELETE", body: JSON.stringify({ kind, id, date, password }) });
      setState(latest); const [insights, goalPlan] = await Promise.all([api("/api/insights"), api("/api/goal-plan")]); setInsightsData({ ...insights, goalPlan });
      setError(kind === "meal" ? "הארוחה נמחקה והמדדים חושבו מחדש." : "המים נמחקו והמדדים חושבו מחדש.");
      setHistoryDeleteRequest(null);
    } catch (e) { setError((e as Error).message); }
  }
  async function deleteHistoryEntry(kind: "meal" | "water", id: string, date: string) {
    if (kind === "meal") { setHistoryDeleteRequest({ kind, id, date, password: "" }); return; }
    await performHistoryDelete(kind, id, date);
  }
  async function undoDeleteMeal() {
    if (!undoMeal) return;
    try {
      setState(
        await api("/api/trash", {
          method: "PATCH",
          body: JSON.stringify({ id: undoMeal.id }),
        }),
      );
      setUndoMeal(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function undoRecentAction() {
    if (!recentUndo) return;
    const action = recentUndo;
    setRecentUndo(null);
    try {
      if (action.kind === "meal" && action.id) setState(await api("/api/meals", { method: "DELETE", body: JSON.stringify({ id: action.id }) }));
      else if (action.kind === "water" && action.amount && action.beverageId) setState(await api("/api/water", { method: "POST", body: JSON.stringify({ amount: -action.amount, beverageId: action.beverageId }) }));
      else if (action.kind === "activity" && action.id) setState(await api("/api/activity", { method: "DELETE", body: JSON.stringify({ id: action.id }) }));
      setMealResult({ name: `הפעולה “${action.name}” בוטלה`, kcal: 0, protein: 0, carbs: 0, fat: 0, edited: true });
    } catch (e) { setError((e as Error).message); }
  }
  function editMeal(meal: any) {
    const date = new Date(meal.time);
    setEditingMealId(meal.id);
    mealEditBaseUpdatedAt.current = String(meal.updatedAt || "");
    setMealDetailsOpen(true);
    setMealForm({
      name: meal.name,
      kcal: meal.kcal,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    });
    setMealItems(structuredClone(meal.items || []));
    setMealPeriod(meal.period || "snack");
    setMealDateTime(localDateTimeInput(date));
    setMealSource(meal.source || "manual");
    setPhotoPreview(meal.image || "");
    setSaveToLibrary(false);
    setSaveAsFavorite(false);
    setManualAiMode(false);
    setCatalogOnly(false);
    setMealReviewReady(true);
    setMealOpen(true);
  }
  async function repeatFavorite(id: string) {
    try {
      setState(
        await api("/api/favorites", {
          method: "POST",
          body: JSON.stringify({ action: "repeat", id }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function addMealToFavorites(mealId: string) {
    try {
      setState(await api("/api/favorites", { method: "POST", body: JSON.stringify({ mealId }) }));
    } catch (e) { setError((e as Error).message); }
  }
  async function removeFavorite(id: string) {
    try {
      setState(await api("/api/favorites", { method: "DELETE", body: JSON.stringify({ id }) }));
    } catch (e) { setError((e as Error).message); }
  }
  async function toggleDraftFavorite() {
    if (busy) return;
    const calculated = calculateMealDraft(mealItems, mealForm); const name = String(mealForm.name || mealItems.map((item) => item.name).filter(Boolean).slice(0, 3).join(" · ")).trim();
    if (!name || !(Number(calculated.kcal) > 0)) { setFavoriteStatus("כדי לשמור במועדפים נדרש שם וערך קלורי."); return; }
    const existing = (state.favorites || []).find((item: any) => item.meal?.name === name);
    try {
      setFavoriteStatus(saveAsFavorite || existing ? "מסיר מהמועדפים…" : "שומר במועדפים…");
      if (saveAsFavorite || existing) {
        const payload = { id: existing?.id, name };
        if (navigator.onLine) setState(await api("/api/favorites", { method: "DELETE", body: JSON.stringify(payload) }));
        else { await queueMutation("/api/favorites", "DELETE", JSON.stringify(payload)); setState((current: any) => ({ ...current, favorites: (current.favorites || []).filter((item: any) => item.meal?.name !== name) })); setOfflineQueueCount(await offlinePendingCount()); }
        setSaveAsFavorite(false); setFavoriteStatus("הארוחה הוסרה מהמועדפים.");
      } else {
        const meal = { name, kcal: Math.round(calculated.kcal), protein: Math.round(calculated.protein), carbs: Math.round(calculated.carbs), fat: Math.round(calculated.fat) };
        if (navigator.onLine) setState(await api("/api/favorites", { method: "POST", body: JSON.stringify({ meal }) }));
        else { await queueMutation("/api/favorites", "POST", JSON.stringify({ meal })); setState((current: any) => ({ ...current, favorites: [...(current.favorites || []), { id: `offline-favorite-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), meal, pendingSync: true }] })); setOfflineQueueCount(await offlinePendingCount()); }
        setSaveAsFavorite(true); setFavoriteStatus(navigator.onLine ? "נשמר במועדפים ✓" : "נשמר במכשיר ויסונכרן למועדפים ✓");
      }
    } catch (e) { setFavoriteStatus(`השמירה במועדפים נכשלה: ${(e as Error).message}`); }
  }
  async function saveFavorite(favorite: any) {
    try { setState(await api("/api/favorites", { method: "PUT", body: JSON.stringify({ id: favorite.id, ...favorite.meal }) })); setPendingFavorite(null); }
    catch (e) { setError((e as Error).message); }
  }
  async function calculateFavorite(favorite: any) {
    try { setBusy(true); const result = await api("/api/ai/analyze-text", { method: "POST", body: JSON.stringify({ description: `${favorite.meal.name}, מנה אחת. חשב קלוריות וחלבון פחמימות ושומן.` }) }); const calculated = calculateMealDraft(result.items || [], result); setPendingFavorite({ ...favorite, editing: true, meal: { ...favorite.meal, kcal: Math.round(calculated.kcal || 0), protein: Math.round(calculated.protein || 0), carbs: Math.round(calculated.carbs || 0), fat: Math.round(calculated.fat || 0) } }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function openProfile() {
    setProfileTab("basic");
    setProfileForm({
      name: state?.owner?.name || "",
      email: state?.owner?.email || "",
      accountPassword: "",
      birthDate: profile.birthDate || "",
      age: profile.age,
      height: profile.height,
      targetWeight: profile.targetWeight,
      initialWeight: profile.initialWeight || 0,
      initialWeightPassword: "",
      activity: profile.activity,
      workoutTypes: profile.workoutTypes || [],
      diet: profile.diet,
      restrictions: profile.restrictions || "",
      diabetesStatus: profile.diabetesStatus || "none",
      hypertension: Boolean(profile.hypertension),
      foodAllergies: profile.foodAllergies || "",
      relevantMedications: profile.relevantMedications || "",
      pregnancyStatus: profile.pregnancyStatus || "none",
      trainingDayBonus: profile.trainingDayBonus || 0,
      targetMode: profile.targetMode || "automatic",
      customCalories: profile.calories,
      customProtein: profile.protein,
      customCarbs: profile.carbs,
      customFat: profile.fat,
      tasteProfile: profile.tasteProfile || { likes: [], dislikes: [], prepTime: "medium" },
      acquaintance: profile.acquaintance || { bloodType: "", occupation: "", sleepHours: 0, stressLevel: 0, dailySchedule: "", mealPattern: "", cookingAccess: "", foodBudget: "", hungerTimes: "", emotionalEating: "", digestiveIssues: "", coachingStyle: "", motivation: "", eatingChallenges: "" },
      notificationPreferences: { ...notificationPreferenceDefaults, ...(profile.notificationPreferences || {}) },
      language: profile.language || "he",
      coachVoice: profile.coachVoice || "male",
      coachVoiceStyle: profile.coachVoiceStyle || "warm",
      coachVoiceProvider: profile.coachVoiceProvider || "cloud",
      coachName: String(profile.coachName || "Cal").toLowerCase() === "ezi" ? "Eazi" : "Cal",
      coachGender: profile.coachGender || "male",
      userAddressGender: profile.userAddressGender || (profile.sex === "female" ? "female" : "male"),
      dayBoundaryMode: profile.dayBoundaryMode || "midnight",
      cameraCalibration: profile.cameraCalibration || { reference: "none", plateDiameterCm: 26, useLearnedCorrections: true },
      avatar: profile.avatar || "",
    });
    setWeightValue(latestWeight);
    setProfileOpen(true);
  }
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (!navigator.onLine) {
        if (profileForm.email !== state.owner.email || profileForm.accountPassword || profileForm.initialWeightPassword) throw new Error("שינוי אימייל, סיסמה או משקל התחלתי דורש חיבור מאובטח לרשת.");
        const offlineProfile = { ...profileForm, accountPassword: "", initialWeightPassword: "", avatar: profile.avatar || "", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        await queueMutation("/api/profile", "PUT", JSON.stringify(offlineProfile));
        if (weightValue && Number(weightValue) !== Number(latestWeight)) await queueMutation("/api/measurements", "POST", JSON.stringify({ weight: weightValue, date: state.today.date }));
        setState((current: any) => ({ ...current, profile: { ...current.profile, ...offlineProfile, age: exactAge(offlineProfile.birthDate) ?? current.profile.age, weight: weightValue || current.profile.weight } }));
        setCoachVoice(offlineProfile.coachVoice === "female" ? "female" : "male"); setCoachVoiceStyle(offlineProfile.coachVoiceStyle === "clear" ? "clear" : "warm"); setCoachVoiceProvider(offlineProfile.coachVoiceProvider === "device" ? "device" : "cloud");
        setOfflineQueueCount(await offlinePendingCount()); setProfileOpen(false); setMealResult({ name: "הפרטים נשמרו במכשיר וממתינים לסנכרון", kcal: 0, protein: 0, carbs: 0, fat: 0 }); return;
      }
      let latest = await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ ...profileForm, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      if (weightValue && Number(weightValue) !== Number(latestWeight))
        latest = await api("/api/measurements", {
          method: "POST",
          body: JSON.stringify({ weight: weightValue }),
        });
      setState(latest);
      setCoachVoice(latest.profile?.coachVoice === "female" ? "female" : "male"); setCoachVoiceStyle(latest.profile?.coachVoiceStyle === "clear" ? "clear" : "warm"); setCoachVoiceProvider(latest.profile?.coachVoiceProvider === "device" ? "device" : "cloud");
      setProfileOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveAcquaintance() {
    setBusy(true);
    try {
      if (!navigator.onLine) {
        const offlineProfile = { ...profileForm, accountPassword: "", initialWeightPassword: "", avatar: profile.avatar || "", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        await queueMutation("/api/profile", "PUT", JSON.stringify(offlineProfile)); setState((current: any) => ({ ...current, profile: { ...current.profile, ...offlineProfile } })); setOfflineQueueCount(await offlinePendingCount()); setAcquaintanceOpen(false); return;
      }
      const latest = await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ ...profileForm, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      setState(latest);
      setAcquaintanceOpen(false);
      setError("השאלון נשמר. המאמן וההמלצות יתחשבו רק במידע שבחרת לשתף.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function updateAdminUserCredentials(user: any) {
    const draft = adminUserEdits[user.id] || { email: user.email || "", password: "" };
    setBusy(true);
    setAiStatus("");
    try {
      await api("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ id: user.id, email: draft.email, password: draft.password }),
      });
      setAdminUsers(await api("/api/admin/users"));
      setAdminUserEdits((current) => ({ ...current, [user.id]: { email: draft.email.trim(), password: "" } }));
      setAiStatus(`פרטי ההתחברות של ${user.name} עודכנו ✓`);
    } catch (e) {
      setAiStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function calculateActivityWithAi() {
    if (!activityForm.description.trim()) { setActivityAiStatus("תאר את הפעילות, הקצב והמשך שלה."); return; }
    setBusy(true); setActivityAiStatus("מחשב לפי התיאור והמשקל שלך…");
    try { const draft = await api("/api/ai/activity-draft", { method: "POST", body: JSON.stringify({ description: activityForm.description }) }); setActivityForm({ ...activityForm, ...draft, description: activityForm.description }); setActivityAiStatus(`${draft.explanation} · בדוק ואשר לפני השמירה.`); }
    catch (e) { setActivityAiStatus((e as Error).message); }
    finally { setBusy(false); }
  }
  async function startNewCycle(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { const latest = await api("/api/profile/cycle", { method: "POST", body: JSON.stringify(newCycleForm) }); setState(latest); setNewCycleOpen(false); setProfileOpen(false); setMealResult({ name: "סבב חדש התחיל — ההיסטוריה הקודמת נשמרה", kcal: 0, protein: 0, carbs: 0, fat: 0 }); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function openTasteWizard() {
    const current = profile?.tasteProfile || { likes: [], dislikes: [], prepTime: "medium" };
    setProfileForm({ name: state?.owner?.name || "", birthDate: profile.birthDate || "", age: profile.age, height: profile.height, targetWeight: profile.targetWeight, activity: profile.activity, diet: profile.diet, restrictions: profile.restrictions || "", diabetesStatus: profile.diabetesStatus || "none", hypertension: Boolean(profile.hypertension), foodAllergies: profile.foodAllergies || "", relevantMedications: profile.relevantMedications || "", pregnancyStatus: profile.pregnancyStatus || "none", trainingDayBonus: profile.trainingDayBonus || 0, targetMode: profile.targetMode || "automatic", customCalories: profile.calories, customProtein: profile.protein, customCarbs: profile.carbs, customFat: profile.fat, avatar: profile.avatar || "", tasteProfile: current });
    setTasteDraft(structuredClone(current)); setTasteWizardStep(0); setProfileOpen(false); setTasteWizardOpen(true);
  }
  async function saveTasteWizard() {
    setBusy(true);
    try {
      const latest = await api("/api/profile", { method: "PUT", body: JSON.stringify({ ...profileForm, tasteProfile: { ...tasteDraft, completedAt: new Date().toISOString() }, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
      setState(latest); setProfileForm((current: any) => ({ ...current, tasteProfile: tasteDraft })); setTasteWizardOpen(false);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function setTasteChoice(option: string, choice: "like" | "neutral" | "dislike") {
    setTasteDraft((current: any) => ({ ...current, likes: choice === "like" ? [...new Set([...(current.likes || []), option])] : (current.likes || []).filter((item: string) => item !== option), dislikes: choice === "dislike" ? [...new Set([...(current.dislikes || []), option])] : (current.dislikes || []).filter((item: string) => item !== option) }));
  }
  async function loadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const avatar = await prepareImage(file, 512, 0.78);
      setProfileForm((current: any) => ({ ...current, avatar }));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function switchUser() {
    await api("/api/auth/session", { method: "DELETE" });
    window.location.reload();
  }
  async function deleteMyData() {
    const password = window.prompt(
      "שלב 1 מתוך 2: הזן את הסיסמה הנוכחית כדי לאמת את מחיקת החשבון.",
    );
    if (!password) return;
    const confirmed = window.confirm(
      "שלב 2 מתוך 2: למחוק לצמיתות את החשבון וכל הארוחות, המדידות, השיחות והתמונות? לא ניתן לבטל פעולה זו.",
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await api("/api/export", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: "DELETE MY DATA", password }),
      });
      window.location.reload();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function invitePartner(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      setState(
        await api("/api/partnerships", {
          method: "POST",
          body: JSON.stringify(partnerForm),
        }),
      );
      setPartnerForm({ email: "", userIds: [], daily: true, meals: true, weight: false, trends: false });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function updatePartnership(id: string, action: "accept" | "reject" | "revoke") {
    try {
      setState(
        await api("/api/partnerships", {
          method: "PATCH",
          body: JSON.stringify({ id, action }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function openManualMeal(category = "meals") {
    if (category !== "meals") {
      setFoodCategory(category);
      openCustomFood();
      return;
    }
    setEditingMealId("");
    setMealForm({ name: "", kcal: 0, protein: 0, carbs: 0, fat: 0 });
    setMealItems([]);
    setAiOriginalItems([]);
    setMealSource("manual");
    setMealPeriod(mealPeriodFor());
    setManualAiMode(true);
    setManualDescription("");
    setManualPortion("");
    setFoodCategory(category);
    setCatalogOnly(false);
    setSaveToLibrary(false);
    setSaveAsFavorite(false);
    setGenerateFoodArtwork(false);
    setPhotoPreview("");
    setMealDateTime(localDateTimeInput());
    setPhotoStatus("תאר את הארוחה וה-AI יחשב ויפרק אותה לפריטים לפני האישור.");
    setAiCorrection("");
    setAiCorrectionStatus("");
    setMealReviewReady(false);
    setMealDetailsOpen(false);
    setMealSaveFeedback("");
    setMealValidationErrors({});
    setQuickAddOpen(false);
    setMealOpen(true);
  }
  function openForgottenMeals() {
    setQuickAddOpen(false);
    setForgottenMeals([newForgottenMeal()]);
    setForgottenStatus("");
    setForgottenOpen(true);
  }
  function updateForgottenMeal(id: string, changes: any) {
    setForgottenMeals((meals) => meals.map((meal) => meal.id === id ? { ...meal, ...changes, calculated: changes.calculated !== undefined ? changes.calculated : changes.items !== undefined ? true : meal.calculated, error: "" } : meal));
  }
  async function calculateForgottenMeals() {
    const missing = forgottenMeals.filter((meal) => !meal.description.trim());
    if (missing.length) { setForgottenStatus("יש לתאר כל ארוחה לפני החישוב."); return; }
    setBusy(true); setForgottenStatus("מחשב את הארוחות בעזרת AI…");
    try {
      const calculated = [];
      for (const meal of forgottenMeals) {
        const result = await api("/api/ai/analyze-text", { method: "POST", body: JSON.stringify({ description: meal.description }) });
        calculated.push({ ...meal, name: result.name || meal.description, items: result.items || [], calculated: true, error: "" });
      }
      setForgottenMeals(calculated);
      setForgottenStatus("החישוב הושלם. אפשר לתקן כמויות ואז לאשר את כל הארוחות.");
    } catch (e) { setForgottenStatus((e as Error).message); }
    finally { setBusy(false); }
  }
  async function saveForgottenMeals() {
    if (busy || !forgottenMeals.length || forgottenMeals.some((meal) => !meal.calculated || !meal.items.length)) { setForgottenStatus("יש לחשב את כל הארוחות לפני השמירה."); return; }
    setBusy(true); setForgottenStatus("שומר ומעדכן את הימים המתאימים…");
    try {
      for (const meal of forgottenMeals) {
        const occurred = new Date();
        occurred.setDate(occurred.getDate() - Number(meal.dayOffset || 0));
        const [hours, minutes] = String(meal.time || "12:00").split(":").map(Number);
        occurred.setHours(hours || 0, minutes || 0, 0, 0);
        const totals = calculateMealDraft(meal.items, {});
        await api("/api/meals", { method: "POST", body: JSON.stringify({ name: meal.name || meal.description, period: meal.period, occurredAt: occurred.toISOString(), calendarDate: true, ...totals, items: meal.items, source: "manual", confidence: .7 }) });
      }
      const latest = await api("/api/state");
      setState(latest); setForgottenOpen(false); setForgottenMeals([]);
      setMealResult({ name: `${forgottenMeals.length} ארוחות נשמרו`, kcal: Math.round(forgottenMeals.reduce((sum, meal) => sum + calculateMealDraft(meal.items, {}).kcal, 0)), protein: 0, carbs: 0, fat: 0 });
    } catch (e) { setForgottenStatus((e as Error).message); }
    finally { setBusy(false); }
  }
  function openCustomFood() {
    setCustomFoodName("");
    setCustomFoodDraft(null);
    setCustomFoodStatus("");
    setCustomFoodOpen(true);
  }
  async function createCustomFoodDraft() {
    if (!customFoodName.trim()) return;
    setBusy(true);
    setCustomFoodStatus("מחשב מנה ויוצר תמונה…");
    try {
      const result = await api("/api/ai/food-draft", {
        method: "POST",
        body: JSON.stringify({ name: customFoodName, category: quickCategory }),
      });
      setCustomFoodDraft(result);
      setCustomFoodStatus(
        result.imageWarning
          ? `הערכים חושבו. שירות התמונות לא זמין כרגע: ${result.imageWarning}`
          : "אפשר לשמור או לבטל. הערכים הם הערכת AI למנה המוצגת.",
      );
    } catch (e) {
      setCustomFoodStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveCustomFood() {
    if (!customFoodDraft) return;
    setBusy(true);
    try {
      await api("/api/foods", {
        method: "POST",
        body: JSON.stringify({
          ...customFoodDraft,
          category: quickCategory,
          visibility: "private",
        }),
      });
      setState(await api("/api/state"));
      setCustomFoodOpen(false);
      setCustomFoodDraft(null);
      setCustomFoodName("");
    } catch (e) {
      setCustomFoodStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveEditedFood(event: FormEvent) {
    event.preventDefault();
    if (!editingFood) return;
    setBusy(true);
    try {
      await api("/api/foods", {
        method: "PATCH",
        body: JSON.stringify(editingFood),
      });
      setState(await api("/api/state"));
      setEditingFood(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function selectQuickFood(item: any) {
    setMealPeriod("snack");
    setQuickFoodWeight(Number(item.defaultWeight || 100));
    setPendingQuickFood(item);
  }
  async function lookupBarcode(value = barcodeValue) {
    const barcode = String(value || "").replace(/\D/g, "");
    if (barcode.length < 8) { setBarcodeStatus("יש להזין ברקוד תקין בן 8–14 ספרות"); return; }
    setBarcodeStatus("מחפש את המוצר…");
    try {
      const response = await api(`/api/foods/search?barcode=${encodeURIComponent(barcode)}`);
      let product = response.product;
      if (!(Number(product?.kcal) > 0)) {
        setBarcodeStatus("המוצר זוהה; AI משלים את הערכים החסרים…");
        const estimate = await api("/api/ai/analyze-text", { method: "POST", body: JSON.stringify({ description: `${product?.name || "מוצר"} ${product?.brand || ""}, ברקוד ${barcode}, ערכים ל-100 גרם` }) });
        const calculated = calculateMealDraft(estimate.items || [], estimate);
        product = { ...product, name: estimate.name || product.name, kcal: Math.round(calculated.kcal || 0), protein: Math.round(calculated.protein || 0), carbs: Math.round(calculated.carbs || 0), fat: Math.round(calculated.fat || 0), source: `${product.source || "ברקוד"} + השלמת AI` };
      }
      setBarcodeValue(barcode);
      setBarcodeStatus(Number(response.product?.kcal) > 0 ? response.attribution || "המוצר נמצא" : "המוצר זוהה והערכים החסרים הושלמו על ידי AI");
      selectQuickFood(product);
    } catch (error) { setBarcodeStatus((error as Error).message || "הברקוד לא נמצא; אפשר לחפש בשם או להוסיף ידנית"); }
  }
  function confirmQuickFood() {
    const item = pendingQuickFood;
    if (!item) return;
    if (item.name === "מים") {
      addWater();
      setPendingQuickFood(null);
      setQuickAddOpen(false);
      return;
    }
    const factor = item.basis === "100g" ? Math.max(1, quickFoodWeight) / 100 : 1;
    const grams = item.basis === "100g" ? Math.max(1, quickFoodWeight) : Math.max(1, Number(item.defaultWeight || 100));
    const per100Factor = item.basis === "100g" ? 1 : 100 / grams;
    setMealForm({
      name: `${item.name} · ${item.basis === "100g" ? `${quickFoodWeight} גרם` : item.portion}`,
      kcal: Math.round(Number(item.kcal || 0) * factor),
      protein: Math.round(Number(item.protein || 0) * factor * 10) / 10,
      carbs: Math.round(Number(item.carbs || 0) * factor * 10) / 10,
      fat: Math.round(Number(item.fat || 0) * factor * 10) / 10,
    });
    setMealItems([{ name: item.name, grams, quantity: 1, unit: item.portion || "מנה", kcalPer100: Math.round(Number(item.kcal || 0) * per100Factor), proteinPer100: Math.round(Number(item.protein || 0) * per100Factor * 10) / 10, carbsPer100: Math.round(Number(item.carbs || 0) * per100Factor * 10) / 10, fatPer100: Math.round(Number(item.fat || 0) * per100Factor * 10) / 10, nutritionSource: { source: String(item.source || item.attribution || (item.barcode ? "Open Food Facts" : "CALOREAZI_CURATED")), sourceId: String(item.barcode || item.id || "catalog") } }]);
    setAiOriginalItems([]);
    setMealSource("manual");
    setMealPeriod(mealPeriodFor());
    setManualAiMode(false);
    setPhotoPreview("");
    setMealDateTime(localDateTimeInput());
    setPhotoStatus("הפריט מוכן לבדיקה באותו מסך אישור של צילום, דיבור וחיפוש.");
    setMealReviewReady(true);
    setMealDetailsOpen(false);
    setMealSaveFeedback("");
    setPendingQuickFood(null);
    setQuickAddOpen(false);
    setMealOpen(true);
  }
  async function analyzeManualDescription() {
    if (!manualDescription.trim()) return;
    setBusy(true);
    setPhotoStatus("מחשב את הארוחה בעזרת AI…");
    try {
      const result = await api("/api/ai/analyze-text", {
        method: "POST",
        body: JSON.stringify({ description: manualDescription }),
      });
      setMealForm({ name: result.name, kcal: 0, protein: 0, carbs: 0, fat: 0 });
      setMealItems(result.items);
      setAiOriginalItems(structuredClone(result.items));
      setMealReviewReady(true);
      setMealDetailsOpen(false);
      setPhotoStatus(
        `ה-AI זיהה ${result.items.length} פריטים. ${result.explanation || ""} בדוק ואשר.`,
      );
    } catch (e) {
      setPhotoStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function correctMealWithAi() {
    const correction = aiCorrection.trim();
    if (!correction || busy) return;
    setBusy(true);
    setAiCorrectionStatus("מתקן רק את הטיוטה הנוכחית…");
    try {
      const result = await api("/api/ai/analyze-text", {
        method: "POST",
        body: JSON.stringify({
          correction,
          draft: {
            name: mealForm.name,
            items: mealItems,
            totals: calculateMealDraft(mealItems, mealForm),
          },
        }),
      });
      setMealForm({ name: result.name, kcal: 0, protein: 0, carbs: 0, fat: 0 });
      setMealItems(result.items);
      setMealConfidence(result.confidence || "low");
      setMealReviewReady(true);
      setMealDetailsOpen(false);
      setAiCorrection("");
      setAiCorrectionStatus(`התיקון הוחל. ${result.explanation || "בדוק את הערכים ואשר."}`);
    } catch (e) {
      setAiCorrectionStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function completeMissingNutrition(name: string, items: any[]) {
    const missing = items.map((item, index) => Number(item.kcalPerUnit || 0) > 0 || Number(item.kcalPer100 || 0) > 0 ? -1 : index).filter((index) => index >= 0);
    if (!missing.length) return items;
    const completion = await api("/api/ai/analyze-text", { method: "POST", body: JSON.stringify({ correction: "השלם רק ערכים תזונתיים חסרים ל־100 גרם לפי המזון המזוהה. אל תשנה שמות, כמויות או משקלים.", draft: { name, items } }) });
    return items.map((item, index) => {
      if (!missing.includes(index)) return item;
      const estimate = completion.items?.[index] || completion.items?.find((candidate: any) => candidate.name === item.name);
      return estimate ? { ...item, kcalPer100: Number(estimate.kcalPer100 || 0), proteinPer100: Number(estimate.proteinPer100 || 0), carbsPer100: Number(estimate.carbsPer100 || 0), fatPer100: Number(estimate.fatPer100 || 0), nutritionStatus: "estimated", nutritionSource: { source: "AI_ESTIMATE", sourceId: item.name, sourceVersion: "live" } } : item;
    });
  }
  async function recalculateMealWithAi() {
    if (busy || (!mealItems.length && !mealForm.name.trim())) return;
    setBusy(true); setMealSaveFeedback("מחשב מחדש לפי השמות, המשקלים והכמויות המעודכנים…");
    try {
      const result = await api("/api/ai/analyze-text", { method: "POST", body: JSON.stringify(mealItems.length ? { correction: "חשב מחדש את הערכים התזונתיים לפי השמות, המשקלים והכמויות הנוכחיים. אל תשנה את הרכב הארוחה.", draft: { name: mealForm.name, items: mealItems } } : { description: `${mealForm.name}, ${manualPortion || "מנה אחת"}` }) });
      setMealForm((current) => ({ ...current, name: result.name || current.name, kcal: 0, protein: 0, carbs: 0, fat: 0 }));
      setMealItems(result.items || []); setMealReviewReady(true); setMealSaveFeedback("החישוב עודכן לפי הכמויות הנוכחיות ✓");
    } catch (e) { setMealSaveFeedback((e as Error).message || "החישוב מחדש נכשל."); }
    finally { setBusy(false); }
  }
  function openMealPreview(meal: any, fromHistory = false) {
    setMealPreviewReturnToHistory(fromHistory);
    setMealPreviewReturnToInsights(false);
    if (fromHistory) setHistoryOpen(false);
    setMealPreview(meal);
  }
  function closeMealPreview() {
    setMealPreview(null);
    if (mealPreviewReturnToHistory) setHistoryOpen(true);
    if (mealPreviewReturnToInsights) setInsightsOpen(true);
    setMealPreviewReturnToHistory(false);
    setMealPreviewReturnToInsights(false);
  }
  function updateMealItem(
    index: number,
    field: string,
    value: string | number,
  ) {
    setMealItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }
  function adjustMealItem(index: number, field: string, delta: number, min = 0, max = 3000) {
    setMealItems((items) => items.map((item, itemIndex) => itemIndex === index
      ? { ...item, [field]: Math.min(max, Math.max(min, Number(item[field] || 0) + delta)) }
      : item));
  }
  function adjustMealForm(field: "kcal" | "protein" | "carbs" | "fat", delta: number) {
    setMealForm((current) => ({ ...current, [field]: Math.max(field === "kcal" ? 1 : 0, Number(current[field] || 0) + delta) }));
  }
  function addCustomMealItem() {
    setMealItems((items) => [
      ...items,
      {
        name: "",
        grams: 100,
        quantity: 1,
        unit: "מנה",
        kcalPer100: 0,
        proteinPer100: 0,
        carbsPer100: 0,
        fatPer100: 0,
      },
    ]);
  }
  async function saveAi(test = false) {
    setBusy(true);
    setAiStatus("");
    try {
      const saved = await api("/api/ai/settings", {
        method: "PUT",
        body: JSON.stringify(aiForm),
      });
      setState((current) => (current ? { ...current, ai: saved } : current));
      setAiForm(
        (current) =>
          ({
            ...current,
            apiKey: "",
            keyConfigured: saved.keyConfigured,
          }) as any,
      );
      if (test) {
        await api("/api/ai/settings", { method: "POST" });
        setAiStatus("החיבור תקין ✓");
      } else setAiStatus("ההגדרות נשמרו ✓");
    } catch (e) {
      setAiStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeAdminPassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setAiStatus("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setAiStatus("אימות הסיסמה החדשה אינו תואם");
      setBusy(false);
      return;
    }
    try {
      await api("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify(passwordForm),
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setAiStatus("סיסמת המנהל הוחלפה וכל החיבורים האחרים נותקו ✓");
    } catch (e) {
      setAiStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function prepareImage(file: File, maxSize = 960, quality = 0.65, decodedImage?: HTMLImageElement) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/))
      throw new Error("יש לבחור תמונת JPG, PNG או WebP");
    const url = decodedImage ? "" : URL.createObjectURL(file);
    const image = decodedImage || new Image();
    if (!decodedImage) {
      image.src = url;
      await image.decode();
    }
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas
      .getContext("2d")
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (url) URL.revokeObjectURL(url);
    return canvas.toDataURL("image/jpeg", quality);
  }
  async function analyzePhotoFile(file: File, recognitionHint = "") {
    setManualAiMode(false);
    setMealSource("photo");
    setMealItems([]);
    setMealForm({ name: "", kcal: 0, protein: 0, carbs: 0, fat: 0 });
    setPhotoPreview("");
    setPhotoQuality(null);
    setPhotoStatus("מכין את התמונה לזיהוי…");
    setMealOpen(true);
    setMealDateTime(localDateTimeInput());
    setMealPeriod(mealPeriodFor());
    setMealReviewReady(false);
    setMealSaveFeedback("");
    setSaveAsFavorite(false);
    setMealValidationErrors({});
    setBusy(true);
    setPhotoStatus("מנתח את הארוחה בעזרת AI…");
    try {
      const originalUrl = URL.createObjectURL(file);
      const original = new Image(); original.src = originalUrl; await original.decode();
      const shortestSide = Math.min(original.width, original.height);
      const quality = shortestSide < 480
        ? { level: "warning" as const, message: "התמונה קטנה או לא ברורה מספיק לזיהוי אמין." }
        : { level: "good" as const, message: "איכות ורזולוציית הצילום מתאימות לניתוח." };
      setPhotoQuality(quality);
      let imageDataUrl = await prepareImage(file, navigator.onLine ? 960 : 720, navigator.onLine ? 0.65 : 0.55, original);
      if (!navigator.onLine && imageDataUrl.length > 1_800_000) imageDataUrl = await prepareImage(file, 560, 0.45, original);
      URL.revokeObjectURL(originalUrl);
      setPhotoPreview(imageDataUrl);
      setMealSource("photo");
      setMealItems([]);
      setMealOpen(true);
      if (quality.level === "warning") {
        setPhotoStatus("לא הצלחנו לקרוא את התמונה בביטחון. צלם שוב מקרוב ובתאורה טובה.");
        return;
      }
      const clientId = crypto.randomUUID();
      if (!navigator.onLine) { await queueOfflineCapture({ imageDataUrl, clientId, createdAt: new Date().toISOString() }); setOfflineQueueCount(await offlinePendingCount()); setPhotoPreview(imageDataUrl); setMealSource("photo"); setPhotoStatus("הצילום נשמר במכשיר ויישלח אוטומטית לניתוח כשהחיבור יחזור."); setMealOpen(true); return; }
      let result = await api("/api/ai/analyze-meal", {
        method: "POST",
        headers: { "Idempotency-Key": clientId },
        body: JSON.stringify({ imageDataUrl, clientId, recognitionHint: recognitionHint.trim() }),
      });
      const jobId = result.jobId;
      setAnalysisJobId(jobId || "");
      for (let attempt = 0; !result.items && attempt < 90; attempt += 1) {
        setPhotoStatus(
          result.status === "processing"
            ? "מזהה פריטים וכמויות…"
            : "הצילום נשמר וממתין לניתוח…",
        );
        await new Promise((resolve) => window.setTimeout(resolve, attempt < 8 ? 250 : 500));
        result = await api(
          `/api/ai/analyze-meal?id=${encodeURIComponent(jobId)}`,
        );
        if (result.status === "failed" && !result.nextAttemptAt)
          throw new Error(result.errorMessage || "ניתוח התמונה נכשל");
        if (result.status === "cancelled") throw new Error("ניתוח התמונה בוטל");
        result = result.result ? { ...result.result, jobId } : result;
      }
      if (!result.items)
        throw new Error(
          "הניתוח עדיין לא הסתיים. הוא נשמר וניתן לנסות שוב בעוד רגע.",
        );
      let nutritionCompletionWarning = "";
      if (result.items.some((item: any) => !(Number(item.kcalPerUnit) > 0) && !(Number(item.kcalPer100) > 0))) {
        setPhotoStatus("הזיהוי הושלם. משלים ערך קלורי לכל מרכיב לפי המשקל…");
        try { result = { ...result, items: await completeMissingNutrition(result.name, result.items) }; }
        catch { nutritionCompletionWarning = " חלק מהערכים לא הושלמו; אפשר ללחוץ על חשב מחדש."; }
      }
      setMealForm({ name: result.name, kcal: 0, protein: 0, carbs: 0, fat: 0 });
      setMealItems(result.items);
      setAiOriginalItems(structuredClone(result.items));
      setMealConfidence(result.confidence || "low");
      setMealReviewReady(true);
      setPhotoStatus(`הזיהוי והחישוב לפי המשקל הושלמו. בדוק ואשר.${nutritionCompletionWarning}`);
      setAiCorrection("");
      setAiCorrectionStatus("");
    } catch (e) {
      setPhotoStatus((e as Error).message);
      setMealOpen(true);
    } finally {
      setBusy(false);
    }
  }
  async function loadFoodImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPhotoPreview(await prepareImage(file, 900, 0.8));
      setGenerateFoodArtwork(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function startVoiceRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceStatus("הדפדפן הזה אינו תומך בהקלטה. אפשר להשתמש בהוספה הידנית.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, { ...(preferredMimeType ? { mimeType: preferredMimeType } : {}), audioBitsPerSecond: 32_000 });
      mediaRecorder.current = recorder;
      audioChunks.current = [];
      browserTranscript.current = "";
      const Recognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (Recognition) {
        const recognition = new Recognition();
        recognition.lang = "he-IL";
        recognition.continuous = true;
        recognition.onresult = (event: any) => {
          browserTranscript.current = Array.from(event.results)
            .map((result: any) => result[0]?.transcript || "")
            .join(" ")
            .trim();
        };
        speechRecognition.current = recognition;
        try {
          recognition.start();
        } catch {
          speechRecognition.current = null;
        }
      }
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunks.current.push(event.data);
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        speechRecognition.current?.stop();
        speechRecognition.current = null;
        if (voiceTimer.current) clearInterval(voiceTimer.current);
        voiceTimer.current = null;
        setRecording(false);
        setVoiceSeconds(0);
        setVoiceStatus("הדפדפן הפסיק את ההקלטה. בדוק הרשאת מיקרופון ונסה שוב.");
      };
      recorder.onstop = async () => {
        if (voiceTimer.current) clearInterval(voiceTimer.current);
        voiceTimer.current = null;
        setVoiceSeconds(0);
        stream.getTracks().forEach((track) => track.stop());
        speechRecognition.current?.stop();
        speechRecognition.current = null;
        const mimeType =
          audioChunks.current.find((chunk) => chunk.type)?.type ||
          recorder.mimeType ||
          "audio/webm";
        const blob = new Blob(audioChunks.current, { type: mimeType });
        mediaRecorder.current = null;
        if (blob.size < 800 || Date.now() - recordingStartedAt.current < 900) {
          setVoiceStatus(
            "לא התקבלה הקלטה מספקת. החזק לפחות שתי שניות, דבר ואז לחץ עצור.",
          );
          return;
        }
        const localTranscript = browserTranscript.current.trim();
        const requestBody = localTranscript
          ? JSON.stringify({ browserTranscript: localTranscript })
          : (() => {
              const form = new FormData();
              form.set("audio", blob, `meal-recording.${mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm"}`);
              return form;
            })();
        setBusy(true);
        setVoiceProcessingSeconds(0);
        setVoiceStatus(
          browserTranscript.current
            ? "התמלול התקבל. מנתח פריטים וכמויות…"
            : "מעלה ומתמלל את ההקלטה…",
        );
        voiceProcessingTimer.current = setInterval(
          () => setVoiceProcessingSeconds((seconds) => seconds + 1),
          1000,
        );
        try {
          const result = await api("/api/ai/analyze-voice", {
            method: "POST",
            ...(localTranscript ? { headers: { "Content-Type": "application/json" } } : {}),
            body: requestBody,
          });
          setMealSource("voice");
          setMealTranscript(result.transcript);
          setMealForm({
            name: result.name,
            kcal: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          });
          setMealItems(result.items);
          setAiOriginalItems(structuredClone(result.items));
          setMealPeriod(mealPeriodFor());
          setMealReviewReady(true);
          setMealDetailsOpen(false);
          setPhotoPreview("");
          setMealDateTime(localDateTimeInput());
          setPhotoStatus(
            `תמלול: “${result.transcript}”\nזוהו ${result.items.length} פריטים. בדוק שמות, משקל וכמות; החישוב יתבצע רק באישור.`,
          );
          setSaveToLibrary(false);
          setFoodVisibility("private");
          setGenerateFoodArtwork(true);
          setVoiceOpen(false);
          setQuickAddOpen(false);
          setMealOpen(true);
        } catch (e) {
          setVoiceStatus((e as Error).message);
        } finally {
          if (voiceProcessingTimer.current)
            clearInterval(voiceProcessingTimer.current);
          voiceProcessingTimer.current = null;
          setBusy(false);
        }
      };
      recordingStartedAt.current = Date.now();
      recorder.start();
      setVoiceSeconds(0);
      setRecording(true);
      setVoiceStatus("מקליט… דבר ברצף לפחות שתי שניות ואז לחץ עצור.");
      voiceTimer.current = setInterval(
        () =>
          setVoiceSeconds((seconds) => {
            if (seconds >= 59) {
              if (recorder.state === "recording") recorder.stop();
              setRecording(false);
              return 60;
            }
            return seconds + 1;
          }),
        1000,
      );
    } catch (error) {
      setVoiceStatus(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "לא ניתנה הרשאה למיקרופון. אשר גישה בדפדפן ונסה שוב."
          : "לא ניתן להפעיל את המיקרופון בדפדפן הזה. נסה לפתוח ב־HTTPS או בדפדפן חיצוני.",
      );
    }
  }
  function stopVoiceRecording() {
    const recorder = mediaRecorder.current;
    if (recorder?.state === "recording") {
      setVoiceStatus("מסיים את ההקלטה…");
      recorder.stop();
    }
    setRecording(false);
  }
  function stopCoachSpeech() {
    coachSpeechRun.current += 1;
    coachSpeechRequest.current?.abort();
    coachSpeechRequest.current = null;
    try { coachAudioSource.current?.stop(); } catch { /* source may already be stopped */ }
    coachAudioSource.current = null;
    coachAudio.current?.pause();
    coachAudio.current = null;
    if (coachAudioUrl.current) URL.revokeObjectURL(coachAudioUrl.current);
    coachAudioUrl.current = "";
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setCoachSpeaking(false);
    setCoachSpeechPending(false);
  }
  function openTopMealPreview() {
    const id = insightsData?.summary?.topMealDetails?.id;
    if (!id) return;
    const meal = [state.today, ...(state.history || [])].flatMap((day: any) => day.meals || []).find((item: any) => item.id === id);
    if (meal) {
      setMealPreviewReturnToHistory(false);
      setMealPreviewReturnToInsights(true);
      setInsightsOpen(false);
      setMealPreview(meal);
    }
  }
  function unlockCoachAudio() {
    if (typeof window === "undefined") return;
    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextConstructor) return;
    if (!coachAudioContext.current) coachAudioContext.current = new AudioContextConstructor();
    if (coachAudioContext.current.state === "suspended") void coachAudioContext.current.resume();
  }
  function speakWithDevice(text: string, run = coachSpeechRun.current) {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const spokenText = text.replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/(\d+)\s*kcal/gi, "$1 קלוריות").replace(/(\d+)\s*g\b/gi, "$1 גרם").replace(/%/g, " אחוז").replace(/[*#_`>]/g, " ").replace(/\s+/g, " ").trim();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    const voices = window.speechSynthesis.getVoices();
    const hebrewVoices = voices.filter((voice) => /^he(?:-|_)/i.test(voice.lang) || voice.lang.toLowerCase().includes("he"));
    utterance.voice = hebrewVoices.find((voice) => coachVoice === "female" ? /female|carmit|sivan|נעמה/i.test(voice.name) : /male|asher|daniel|יואב/i.test(voice.name)) || hebrewVoices[0] || null;
    utterance.lang = "he-IL";
    utterance.rate = coachVoiceStyle === "clear" ? 1.08 : 1.04;
    utterance.pitch = coachVoice === "female" ? 1.04 : 0.94;
    utterance.onstart = () => { if (run === coachSpeechRun.current) setCoachSpeaking(true); };
    utterance.onend = () => { if (run === coachSpeechRun.current) setCoachSpeaking(false); };
    utterance.onerror = () => { if (run === coachSpeechRun.current) setCoachSpeaking(false); };
    window.speechSynthesis.speak(utterance);
  }
  async function speakCoachReply(text: string) {
    if (!text.trim()) return;
    stopCoachSpeech();
    const run = coachSpeechRun.current;
    if (coachVoiceProvider === "device" || state?.ai?.economyMode !== false || state?.ai?.cloudTtsEnabled !== true) { speakWithDevice(text, run); return; }
    const controller = new AbortController();
    coachSpeechRequest.current = controller;
    setCoachSpeechPending(true);
    try {
      const response = await fetch("/api/ai/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice: coachVoice, style: coachVoiceStyle, provider: coachVoiceProvider }), signal: controller.signal });
      if (!response.ok) throw new Error("cloud voice unavailable");
      const audioBytes = await response.arrayBuffer();
      if (run !== coachSpeechRun.current) return;
      const context = coachAudioContext.current;
      if (context) {
        if (context.state === "suspended") await context.resume();
        const buffer = await context.decodeAudioData(audioBytes.slice(0));
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = coachVoiceStyle === "clear" ? 1.12 : 1.08;
        source.connect(context.destination);
        source.onended = () => { if (run === coachSpeechRun.current) stopCoachSpeech(); };
        coachAudioSource.current = source;
        source.start(0);
        setCoachSpeechPending(false);
        setCoachSpeaking(true);
        return;
      }
      const url = URL.createObjectURL(new Blob([audioBytes], { type: response.headers.get("Content-Type") || "audio/mpeg" }));
      const audio = new Audio(url);
      audio.playbackRate = coachVoiceStyle === "clear" ? 1.12 : 1.08;
      coachAudio.current = audio;
      coachAudioUrl.current = url;
      audio.onplay = () => { if (run === coachSpeechRun.current) { setCoachSpeechPending(false); setCoachSpeaking(true); } };
      audio.onended = () => { if (run === coachSpeechRun.current) stopCoachSpeech(); };
      audio.onerror = () => { if (run === coachSpeechRun.current) { stopCoachSpeech(); setError("לא הצלחתי להשמיע את קול הענן. נסה שוב או בחר קול מכשיר בפרופיל."); } };
      await audio.play();
    } catch {
      if (controller.signal.aborted || run !== coachSpeechRun.current) return;
      setCoachSpeechPending(false);
      setCoachSpeaking(false);
      setError("קול הענן לא היה זמין כרגע. לא הופעל קול נוסף; אפשר לנסות שוב או לבחור קול מכשיר בפרופיל.");
    } finally {
      if (coachSpeechRequest.current === controller) coachSpeechRequest.current = null;
    }
  }
  async function sendCoachText(rawText: string, speakResponse = false) {
    const text = rawText.trim();
    if (!text || busy || coachSendInFlight.current) return;
    coachSendInFlight.current = true;
    setMessages((items) => [...items, { role: "user", text }]);
    setMessage("");
    setBusy(true);
    try {
      const data = await api("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, voiceMode: speakResponse }),
      });
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: data.reply,
        },
      ]);
      if (speakResponse) speakCoachReply(data.reply);
      if (/(?:תכניס|תוסיף|הוסף|הכנס).*(?:ארוחה|אוכל|ליומן|לארוחות)/i.test(text)) {
        const draft = await api("/api/ai/analyze-text", { method: "POST", body: JSON.stringify({ description: text }) });
        setEditingMealId("");
        setMealSource("manual");
        setMealPeriod(mealPeriodFor());
        setManualDescription(text);
        setMealForm({ name: draft.name, kcal: 0, protein: 0, carbs: 0, fat: 0 });
        setMealItems(draft.items || []);
        setAiOriginalItems(structuredClone(draft.items || []));
        setMealReviewReady(true);
        setMealDetailsOpen(false);
        setPhotoStatus("המאמן הכין טיוטה. בדוק את הסיכום ולחץ אישור כדי לשמור ביומן.");
        setCoachOpen(false);
        setMealOpen(true);
      }
      const latest = await api("/api/state");
      setState(latest);
    } catch (e) {
      setMessages((items) => [
        ...items,
        { role: "assistant", text: (e as Error).message },
      ]);
    } finally {
      coachSendInFlight.current = false;
      setBusy(false);
    }
  }
  async function analyzePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await analyzePhotoFile(file);
  }
  function closeInAppCamera() {
    mealCameraStream.current?.getTracks().forEach((track) => track.stop());
    mealCameraStream.current = null;
    if (mealCameraVideo.current) mealCameraVideo.current.srcObject = null;
    setCameraCaptureOpen(false);
    setCameraStatus("");
  }
  async function openInAppCamera() {
    setQuickAddOpen(false);
    setCameraHint("");
    setCameraStatus("פותח מצלמה…");
    setCameraCaptureOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      mealCameraStream.current = stream;
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      if (!mealCameraVideo.current) throw new Error("תצוגת המצלמה אינה זמינה");
      mealCameraVideo.current.srcObject = stream;
      await mealCameraVideo.current.play();
      setCameraStatus("מקם את כל הארוחה במרכז ובתאורה טובה");
    } catch {
      closeInAppCamera();
      directCameraInput.current?.click();
    }
  }
  async function captureInAppMeal() {
    const video = mealCameraVideo.current;
    if (!video?.videoWidth || !video.videoHeight) { setCameraStatus("המצלמה עדיין נטענת…"); return; }
    const maxSize = 1600; const scale = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .86));
    if (!blob) { setCameraStatus("לא הצלחנו לצלם. נסה שוב."); return; }
    const hint = cameraHint;
    closeInAppCamera();
    await analyzePhotoFile(new File([blob], `meal-${Date.now()}.jpg`, { type: "image/jpeg" }), hint);
  }
  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    await sendCoachText(message);
  }
  function startCoachDictation() {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { void startCoachRecording(); return; }
    if (busy) return;
    unlockCoachAudio();
    stopCoachSpeech();
    coachTranscript.current = "";
    setMessage("");
    coachSpeechRecognition.current?.abort?.();
    const recognition = new Recognition();
    coachSpeechRecognition.current = recognition;
    recognition.lang = "he-IL";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { coachTranscript.current = ""; setCoachListening(true); };
    recognition.onresult = (event: any) => { const text = Array.from(event.results).map((result: any) => result[0]?.transcript || "").join(" ").trim(); if (text) { coachTranscript.current = text; setMessage(text); } };
    recognition.onerror = (event: any) => { coachTranscript.current = ""; coachSpeechRecognition.current = null; setCoachListening(false); setError(event?.error === "no-speech" ? "לא שמעתי אותך. לחץ שוב ודבר כרגיל." : "לא ניתן היה לזהות את ההכתבה. בדוק הרשאת מיקרופון ונסה שוב."); };
    recognition.onend = () => { coachSpeechRecognition.current = null; setCoachListening(false); const text = coachTranscript.current.trim(); if (text) void sendCoachText(text, true); };
    recognition.start();
  }
  async function startCoachRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("המיקרופון אינו זמין. בדוק הרשאה בהגדרות iPhone ונסה שוב."); return; }
    try {
      unlockCoachAudio();
      stopCoachSpeech(); setMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      coachRecordingStream.current = stream; coachAudioChunks.current = [];
      const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      coachRecorder.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) coachAudioChunks.current.push(event.data); };
      recorder.onstop = async () => {
        coachRecorder.current = null; stream.getTracks().forEach((track) => track.stop()); coachRecordingStream.current = null; setCoachListening(false);
        const blob = new Blob(coachAudioChunks.current, { type: recorder.mimeType || "audio/webm" }); coachAudioChunks.current = [];
        if (blob.size < 800) { setError("לא שמעתי הודעה. לחץ שוב ודבר כרגיל."); return; }
        setCoachTranscribing(true);
        try {
          const form = new FormData(); form.append("audio", blob, recorder.mimeType.includes("mp4") ? "coach.m4a" : "coach.webm");
          const response = await fetch("/api/ai/transcribe", { method: "POST", body: form }); const data = await response.json();
          if (!response.ok) throw new Error(data.error || "התמלול נכשל");
          setMessage(data.transcript); await sendCoachText(data.transcript, true);
        } catch (error) { setError((error as Error).message); } finally { setCoachTranscribing(false); }
      };
      recorder.start(250); setCoachListening(true);
    } catch { setError("לא ניתנה גישה למיקרופון. אשר הרשאה ל־CALOREAZI בהגדרות iPhone."); }
  }
  function stopCoachListening() {
    unlockCoachAudio();
    if (coachSpeechRecognition.current) { coachSpeechRecognition.current.stop?.(); return; }
    if (coachRecorder.current?.state === "recording") coachRecorder.current.stop();
    coachRecorder.current = null;
  }
  async function clearCoachDisplay() {
    try { await api("/api/ai/chat", { method: "PATCH" }); setMessages([]); }
    catch (e) { setError((e as Error).message); }
  }
  async function enableNotifications() {
    setNotificationStatus("");
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) { setNotificationStatus("התראות Push אינן נתמכות בדפדפן הזה."); return; }
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as any).standalone);
    if (isIos && !isStandalone) { setNotificationStatus("באייפון יש להוסיף את CALOREAZI למסך הבית ולפתוח אותה מהאייקון לפני הפעלת התראות."); return; }
    setBusy(true); setError("");
    try {
      setNotificationStatus("מבקש הרשאה מ־iPhone…");
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission(); setNotificationPermission(permission);
      if (permission !== "granted") throw new Error("הרשאת ההתראות לא אושרה. ניתן לשנות זאת בהגדרות ההתראות של iPhone.");
      setNotificationStatus("מכין את שירות ההתראות…");
      const installed = await withTimeout(navigator.serviceWorker.register("./sw.js"), 12_000, "שירות ההתראות לא נטען. סגור את ה־PWA, פתח מחדש ונסה שוב.");
      await withTimeout(installed.update(), 12_000, "עדכון שירות ההתראות התעכב. בדוק חיבור ונסה שוב.").catch(() => undefined);
      const registration = await withTimeout(navigator.serviceWorker.ready, 12_000, "שירות ההתראות עדיין לא פעיל. סגור את ה־PWA, פתח מחדש ונסה שוב.");
      setNotificationStatus("רושם את המכשיר בצורה מאובטחת…");
      const configuration = await api("/api/notifications");
      const applicationServerKey = urlBase64ToUint8Array(configuration.publicKey);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !sameApplicationServerKey(subscription.options.applicationServerKey, applicationServerKey)) { await subscription.unsubscribe(); subscription = null; }
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      setNotificationStatus("שולח התראת בדיקה מהשרת…");
      await api("/api/notifications", { method: "POST", body: JSON.stringify({ subscription: subscription.toJSON() }) });
      setNotificationStatus("ההתראות פעילות — נשלחה התראת בדיקה למסך הנעילה ✓");
    } catch (e) { setNotificationStatus((e as Error).message || "הפעלת ההתראות נכשלה. נסה שוב."); }
    finally { setBusy(false); }
  }
  async function testNotification(type: string, title: string) {
    setTestingNotificationType(type); setNotificationStatus(`שולח בדיקת ${title}…`); setError("");
    try {
      await api("/api/notifications", { method: "PUT", body: JSON.stringify({ type: notificationTestTypes[type] }) });
      setNotificationStatus(`התראת „${title}” נשלחה למכשיר ✓`);
    } catch (e) { setNotificationStatus((e as Error).message || "שליחת ההתראה נכשלה."); }
    finally { setTestingNotificationType(""); }
  }

  if (!state)
    return (
      <main className="loading-screen">
        <img src="/caloreazi-wordmark-transparent.png" alt="CALOREAZI" />
        <span>{error || "טוען את המסלול שלך…"}</span>
      </main>
    );
  if (state.authenticated === false && !state.bootstrapRequired)
    return (
      <Login
        values={loginForm}
        setValues={setLoginForm}
        submit={login}
        busy={busy}
        error={error}
        adminConfigured={state.adminConfigured}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
        setupAdmin={loginAdmin}
      />
    );
  if (!state.owner || !state.profile)
    return (
      <Onboarding
        step={step}
        setStep={setStep}
        values={onboarding}
        setValues={setOnboarding}
        finish={finishOnboarding}
        busy={busy}
        error={error}
        bootstrap={Boolean(state.bootstrapRequired)}
      />
    );

  const mealDraftPreview = calculateMealDraft(mealItems, mealForm);
  const mealReliabilityPreview = assessMealReliability({ ...mealForm, items: mealItems, source: mealSource, explicitCalories: mealItems.length === 0 && mealSource === "manual" && Number(mealForm.kcal) > 0 });
  const draftFavoriteName = String(mealForm.name || mealItems.map((item) => item.name).filter(Boolean).slice(0, 3).join(" · ")).trim();
  const draftAlreadyFavorite = saveAsFavorite || (state.favorites || []).some((item: any) => item.meal?.name === draftFavoriteName);
  const hasPhotoScaleReference = ["plate", "card"].includes(String(profile?.cameraCalibration?.reference || ""));
  const mealRecognitionScore = mealConfidence === "high" ? (mealSource === "photo" && !hasPhotoScaleReference ? 72 : 90) : mealConfidence === "medium" ? 70 : 45;
  const estimatedCalorieRange = mealSource === "photo" && !hasPhotoScaleReference ? { low: Math.round(Number(mealDraftPreview.kcal || 0) * .82 / 5) * 5, high: Math.round(Number(mealDraftPreview.kcal || 0) * 1.18 / 5) * 5 } : null;

  return (
    <main className={dark ? "app-shell theme-dark" : "app-shell"} dir={profile?.language === "en" ? "ltr" : "rtl"} lang={profile?.language || "he"}>
      {!online && (
        <div className="offline-banner">
          אין כרגע חיבור · ההזנות נשמרות במכשיר ויסונכרנו אוטומטית כשהחיבור יתחדש
        </div>
      )}
      <header className="topbar">
        <div className="logo">
          <img
            className="logo-light"
            src="/caloreazi-wordmark-transparent.png"
            alt="CALOREAZI"
          />
          <img
            className="logo-dark"
            src="/caloreazi-wordmark-transparent.png"
            alt=""
            aria-hidden="true"
          />
        </div>
        <div className="top-actions">
          {isAdmin && <button className="admin-header-settings" type="button" onClick={() => void openAdmin()} title="מרכז ניהול ADMIN" aria-label="פתיחת מרכז ניהול ADMIN"><AppIcon name="settings" /></button>}
          <button className="avatar" onClick={openProfile} title="הפרופיל שלי">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" />
            ) : (
              state.owner.name[0]
            )}
          </button>
        </div>
      </header>
      <button className={`sync-indicator sync-${syncStatus}`} type="button" onClick={async () => { setOfflineQueueItems(await listOfflineQueue()); setSyncCenterOpen(true); }} aria-label="פתיחת מרכז הסנכרון">
        <i />
        <span>{!online ? "עובדים Offline" : syncStatus === "syncing" ? "מסנכרן…" : syncStatus === "attention" ? "הסנכרון דורש טיפול" : syncStatus === "success" ? "הכול סונכרן" : offlineQueueCount ? `${offlineQueueCount} ממתינים לסנכרון` : "מחובר ומסונכרן"}</span>
      </button>
      <section className="welcome">
        <div><h1>{greeting}, {state.owner.name}</h1><p>{scoreHeadline}</p></div>
        <button className="welcome-add-button" type="button" onClick={() => { setQuickCategory(""); setQuickAddOpen(true); }} aria-label="פתיחת תפריט הוספת ארוחה" title="הוספת ארוחה"><AppIcon name="mealAdd" /></button>
      </section>
      {(state.partnerships || []).filter((link) => link.direction === "incoming" && link.status === "pending").map((link) => <aside className="partnership-invite-card" key={link.id}><span>♡</span><div><strong>{link.other?.username || link.other?.name} בחר לשתף איתך את התהליך</strong><small>ההזמנה תישאר כאן עד שתבחר</small></div><button onClick={() => updatePartnership(link.id, "accept")}>אשר</button><button className="reject" onClick={() => updatePartnership(link.id, "reject")}>דחה</button></aside>)}
      {consistencyBadges.length > 0 && (
        <div className="consistency-badges" aria-label="הישגים בקצב שלך">
          {consistencyBadges.map((badge) => <span key={badge.label}><b>{badge.icon}</b>{badge.label}</span>)}
        </div>
      )}
      <details className="calm-challenges expandable-surface"><summary><span>◇</span><div><strong>יעדים רגועים להיום</strong><small>מותאמים לשעה, לפערים ולשלב שלך בתהליך</small></div></summary><div>{calmChallenges.map((challenge) => <span className={`challenge-${challenge.tone}`} key={challenge.label}><small>{challenge.label}</small><i><b style={{ width: `${Math.min(100, challenge.value / Math.max(1, challenge.target) * 100)}%` }} /></i><em>{Math.round(challenge.value).toLocaleString()} מתוך {challenge.target.toLocaleString()} {challenge.unit}</em></span>)}</div></details>
      <section className="today-focus-card" aria-label="סיכום היום בקצרה">
        <div><small>תמונת מצב עכשיו</small><strong>{remaining > 0 ? `נותרו ${remaining.toLocaleString()} קלוריות` : `חריגה של ${(consumed - dailyCalorieTarget).toLocaleString()} קלוריות`}{proteinRemaining > 8 ? ` · חסרים כ־${Math.round(proteinRemaining)} גרם חלבון` : " · החלבון בקצב טוב"}{waterRemaining > 300 ? ` · נותרו ${waterRemaining.toLocaleString()} מ״ל שתייה` : " · השתייה בקצב טוב"}</strong></div>
        <button type="button" onClick={() => { const hour = new Date().getHours(); setSuggestionPeriod(hour < 11 ? "breakfast" : hour < 16 ? "lunch" : hour < 20 ? "dinner" : "snack"); window.setTimeout(() => document.getElementById("meal-suggestions")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }}>הצג 3 הצעות</button>
      </section>
      <details className={`daily-score-details score-${scoreTone}`}>
        <summary aria-label="פתיחת הסבר על הציון היומי">
          <div className="daily-score-bar" role="progressbar" aria-label="ציון יומי" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dailyScore}>
            <i style={{ width: `${dailyScore}%` }} />
            <span>{dailyScore}/100</span>
          </div>
        </summary>
        <div className="daily-score-explanation">
          <header>
            <div><strong>{state.dailyScore.status === "insufficient" ? "עדיין אין מספיק נתונים" : state.dailyScore.status === "provisional" ? "ציון ביניים" : "הציון היומי"}: {dailyScore}/100</strong><small>מנוע {state.dailyScore.version || "1.0"} · כיסוי נתונים {Number(state.dailyScore.coverage || 0)}%</small></div>
            <b>{state.dailyScore.recommendation || scoreImprovement?.tip}</b>
          </header>
          <div className="score-parts">
            {scoreGuidance.map((part) => (
              <span key={part.label}><small>{part.label}</small><i><b style={{ width: `${Math.round(part.value / Math.max(1, part.max) * 100)}%` }} /></i><strong>{part.value}/{part.max}</strong><em>כיסוי {part.coverage}%</em><p>{part.why}</p></span>
            ))}
          </div>
          <div className="score-parameter-grid">
            {scoreParameters.map((part: any) => <article key={part.key}><header><strong>{part.label}</strong><b>{part.percent}%</b></header><i><b style={{ width: `${part.percent}%` }} /></i><small>{Math.round(Number(part.value || 0))} מתוך {Math.round(Number(part.target || 0))} {part.unit}</small></article>)}
          </div>
          <p className="score-method-note">הציון הוא כלי הכוונה התנהגותי — לא אבחון רפואי. רכיב שאין עליו מידע אינו מקבל ציון אפס, ורמת הכיסוי מוצגת במפורש.</p>
        </div>
      </details>
      <section className="daily-card">
        <header className="daily-card-heading">
          <div><span>כמות קלוריות יומית</span><strong>{dailyCalorieTarget.toLocaleString()}</strong></div>
          <div><span>נותרו להיום</span><strong>{remaining.toLocaleString()}</strong></div>
          {profile.dayBoundaryMode === "manual" && <button type="button" className="finish-day-button" onClick={() => setDayCloseConfirm(true)}><AppIcon name="history" /><span><small>יום פעיל · {state.today.date}</small><strong>סיים יום</strong></span></button>}
        </header>
        <details className="calorie-details">
          <summary aria-label="פתיחת מידע על חישוב יעד הקלוריות">
            <div
              className="calorie-ring"
              style={{
                "--calorie-progress": `${Math.min(100, (consumed / Math.max(1, dailyCalorieTarget)) * 100)}%`,
              } as React.CSSProperties}
            >
              <div>
                <span>נצרכו היום</span>
                <strong>{consumed.toLocaleString()}</strong>
                <small>קלוריות</small>
              </div>
            </div>
          </summary>
          {profile.caloriePlan && (
            <div className="calorie-explanation-panel">
              <h3>איך חושב היעד?</h3>
              <span>BMI <b>{profile.caloriePlan.bmi}</b></span>
              <span>חילוף חומרים במנוחה <b>{profile.caloriePlan.bmr.toLocaleString()}</b></span>
              <span>תחזוקה משוערת <b>{profile.caloriePlan.maintenanceCalories.toLocaleString()}</b></span>
              <span>התאמה למטרה <b>{profile.caloriePlan.goalAdjustment > 0 ? "+" : ""}{profile.caloriePlan.goalAdjustment}</b></span>
              <span>יעד יומי <b>{profile.calories.toLocaleString()}</b></span>
              <span>קצב שבועי משוער <b>{profile.caloriePlan.expectedWeeklyChangeKg} ק״ג</b></span>
              <small>נוסחת {profile.caloriePlan.formula} × מקדם פעילות {profile.caloriePlan.activityFactor}. האימונים נשמרים להתאמת האימון ואינם נספרים שוב כדי למנוע כפל.</small>
              {profile.caloriePlan.safetyFloorApplied && <small className="safety-note">הופעלה רצפת בטיחות כדי למנוע יעד נמוך מדי.</small>}
              {profile.caloriePlan.goalAdjustedForBmi && <small className="safety-note">BMI נמוך מ־18.5: לא הוגדר גירעון קלורי אוטומטי.</small>}
            </div>
          )}
        </details>
        <div className="daily-copy">
          <div className="macro-grid">
            <button type="button" className="macro-bar protein" aria-expanded={macroDetail === "protein"} onClick={() => setMacroDetail((current) => current === "protein" ? "" : "protein")} style={{ "--progress": `${Math.min(100, Math.round((macros.protein / Math.max(1, profile.protein)) * 100))}%` } as any}>
              <strong>חלבון · {profile.protein} גרם ליום</strong>
              <b>{Math.round((macros.protein / Math.max(1, profile.protein)) * 100)}%</b>
              <small>{macros.protein} גרם נצרכו</small>
            </button>
            {macroDetail === "protein" && <div className="macro-source-inline protein">{state.today.meals.filter((meal) => Number(meal.protein || 0) > 0).sort((a, b) => Number(b.protein || 0) - Number(a.protein || 0)).map((meal) => <span key={meal.id}><strong>{meal.name}</strong><b>{Math.round(Number(meal.protein))} גרם</b></span>)}{!state.today.meals.some((meal) => Number(meal.protein || 0) > 0) && <p>אין מאכלים ברשימה.</p>}</div>}
            <button type="button" className="macro-bar carbs" aria-expanded={macroDetail === "carbs"} onClick={() => setMacroDetail((current) => current === "carbs" ? "" : "carbs")} style={{ "--progress": `${Math.min(100, Math.round((macros.carbs / Math.max(1, profile.carbs)) * 100))}%` } as any}>
              <strong>פחמימות · {profile.carbs} גרם ליום</strong>
              <b>{Math.round((macros.carbs / Math.max(1, profile.carbs)) * 100)}%</b>
              <small>{macros.carbs} גרם נצרכו</small>
            </button>
            {macroDetail === "carbs" && <div className="macro-source-inline carbs">{state.today.meals.filter((meal) => Number(meal.carbs || 0) > 0).sort((a, b) => Number(b.carbs || 0) - Number(a.carbs || 0)).map((meal) => <span key={meal.id}><strong>{meal.name}</strong><b>{Math.round(Number(meal.carbs))}g</b></span>)}{!state.today.meals.some((meal) => Number(meal.carbs || 0) > 0) && <p>אין מאכלים ברשימה.</p>}</div>}
            <button type="button" className="macro-bar fat" aria-expanded={macroDetail === "fat"} onClick={() => setMacroDetail((current) => current === "fat" ? "" : "fat")} style={{ "--progress": `${Math.min(100, Math.round((macros.fat / Math.max(1, profile.fat)) * 100))}%` } as any}>
              <strong>שומן · {profile.fat} גרם ליום</strong>
              <b>{Math.round((macros.fat / Math.max(1, profile.fat)) * 100)}%</b>
              <small>{macros.fat} גרם נצרכו</small>
            </button>
            {macroDetail === "fat" && <div className="macro-source-inline fat">{state.today.meals.filter((meal) => Number(meal.fat || 0) > 0).sort((a, b) => Number(b.fat || 0) - Number(a.fat || 0)).map((meal) => <span key={meal.id}><strong>{meal.name}</strong><b>{Math.round(Number(meal.fat))}g</b></span>)}{!state.today.meals.some((meal) => Number(meal.fat || 0) > 0) && <p>אין מאכלים ברשימה.</p>}</div>}
          </div>
        </div>
      </section>
      <input ref={uploadInput} className="camera-input" type="file" accept="image/*" onChange={analyzePhoto} />
      <input ref={directCameraInput} className="camera-input" type="file" accept="image/*" capture="environment" onChange={analyzePhoto} />
      {error && (
        <button className="notice" onClick={() => setError("")}>
          {error} ×
        </button>
      )}
      {offlineQueueCount > 0 && !syncCenterOpen && <button className="offline-queue-status" type="button" onClick={async () => { setOfflineQueueItems(await listOfflineQueue()); setSyncCenterOpen(true); }}>{offlineQueueCount} {offlineQueueCount === 1 ? "פעולה ממתינה" : "פעולות ממתינות"} לסנכרון · לפרטים</button>}
      {syncCenterOpen && <div className="modal-layer sync-center-layer"><button className="backdrop" onClick={() => setSyncCenterOpen(false)} /><section className="settings-modal sync-center"><header><div><h2>מרכז הסנכרון</h2><p>{!online ? "אין חיבור כרגע. אפשר להמשיך לעבוד כרגיל." : syncStatus === "syncing" ? "הנתונים נשלחים כעת לפי סדר ההזנה." : offlineQueueItems.length ? "הנתונים שמורים במכשיר ולא ייעלמו." : "כל הנתונים מעודכנים בשרת."}</p></div><button type="button" onClick={() => setSyncCenterOpen(false)} aria-label="סגור">×</button></header><div className="sync-summary"><span className={online ? "connected" : "disconnected"}><i />{online ? "מחובר" : "Offline"}</span><strong>{offlineQueueItems.length}</strong><small>פעולות ממתינות</small></div><div className="sync-items">{offlineQueueItems.map((item) => <article className={item.attempts >= 3 ? "failed" : ""} key={`${item.kind}-${item.id}`}><div><strong>{item.label}</strong><small>נשמר {new Date(item.createdAt).toLocaleString("he-IL")}</small>{item.attempts >= 3 && <><em>לא הצלחנו לסנכרן אחרי {item.attempts} ניסיונות</em>{item.lastError && <small>{item.lastError}</small>}</>}</div>{item.attempts >= 3 ? <button type="button" disabled={!online} onClick={async () => { await retryOfflineItem(item); setOfflineQueueItems(await listOfflineQueue()); setSyncRequested((value) => value + 1); }}>נסה שוב</button> : <span>{syncStatus === "syncing" ? "מסנכרן" : "ממתין"}</span>}</article>)}{!offlineQueueItems.length && <div className="sync-empty"><b>✓</b><strong>הכול מסונכרן</strong><span>אין פעולות שממתינות לשליחה.</span></div>}</div><footer><button type="button" onClick={() => setSyncCenterOpen(false)}>סגור</button><button className="primary" type="button" disabled={!online || !offlineQueueItems.length || syncStatus === "syncing"} onClick={() => setSyncRequested((value) => value + 1)}>סנכרן עכשיו</button></footer></section></div>}
      {mealResult && <aside className="meal-result-toast" role="status"><div><strong>{mealResult.edited ? "הפעולה הושלמה" : "הארוחה נוספה ליומן"} ✓</strong><span>{mealResult.name}{mealResult.kcal > 0 ? ` · ${mealResult.kcal} קלוריות` : ""}</span>{mealResult.kcal > 0 && <small>{mealResult.protein} גרם חלבון · {mealResult.carbs} גרם פחמימות · {mealResult.fat} גרם שומן{mealResult.favoriteSaved ? " · נשמרה גם במועדפים ★" : ""}{mealResult.imageCompleted ? " · תמונה הושלמה" : ""}</small>}</div>{recentUndo && <button className="toast-undo-action" type="button" onClick={undoRecentAction}>ביטול</button>}<button onClick={() => setMealResult(null)} aria-label="סגור">×</button></aside>}
      {undoMeal && (
        <aside className="undo-toast" role="status">
          <span>“{undoMeal.name}” נמחקה</span>
          <button onClick={undoDeleteMeal}>בטל מחיקה</button>
          <button aria-label="סגירת הודעה" onClick={() => setUndoMeal(null)}>
            ×
          </button>
        </aside>
      )}
      <section className="content-grid">
        <div className="main-feed">
        <section className="panel meal-suggestions-panel" id="meal-suggestions">
          <header><div><h2>מה כדאי לאכול עכשיו?</h2><p>בחר סוג ארוחה כדי לקבל המלצות מותאמות</p></div><div className="suggestion-actions">{suggestionPeriod && <button type="button" onClick={() => setSuggestionRefresh((value) => value + 1)}>רענן</button>}<button type="button" onClick={openTasteWizard}>העדפות</button></div></header>
          <div className="suggestion-periods">{[["breakfast","בוקר"],["lunch","צהריים"],["dinner","ערב"],["snack","בין ארוחות"]].map(([key,label]) => <button type="button" className={suggestionPeriod === key ? "selected" : ""} onClick={() => setSuggestionPeriod(key)} key={key}>{label}</button>)}</div>
          {suggestionPeriod && <div className="meal-suggestion-list">{mealSuggestions.map((meal) => <article key={meal.name}><div><strong>{meal.name}</strong><small>{meal.reason}{meal.personal ? " · מתאים להעדפות שלך" : ""}</small></div><span><b>{meal.kcal}</b> kcal</span><footer>{meal.protein}g חלבון · {meal.carbs}g פחמימות · {meal.fat}g שומן</footer></article>)}</div>}
          {suggestionPeriod && !profile?.tasteProfile?.completedAt && <button className="taste-survey-callout" type="button" onClick={openTasteWizard}>התאם את ההמלצות אליי · שאלון קצר ולא חובה</button>}
        </section>
        <div className="panel meals-panel">
          <header>
            <div>
              <p className="eyebrow">הארוחות שלי</p>
              <h2>מה אכלת היום</h2>
            </div>
            <div className="meal-header-actions">
              <button type="button" title="הוספת ארוחה" aria-label="פתיחת תפריט הוספת ארוחה" onClick={() => { setQuickCategory(""); setQuickAddOpen(true); }}><AppIcon name="mealAdd" /></button>
            </div>
          </header>
          {quickRepeatMeals.length > 0 && <div className="quick-repeat-meals" aria-label="ארוחות קבועות להוספה מהירה"><small>הרגילות שלך עכשיו</small><div>{quickRepeatMeals.map(({ meal, count }) => <button type="button" key={meal.id || meal.name} disabled={busy} onClick={() => repeatRecentMeal(meal)}><span>＋</span><strong>{meal.name}</strong><small>{Math.round(Number(meal.kcal))} קלוריות{count > 1 ? ` · נאכלה ${count} פעמים` : ""}</small></button>)}</div></div>}
          {state.today.meals.length === 0 && !(state.today.waterEvents || []).length ? (
            <div className="empty-state">
              עדיין אין ארוחות היום.
              <small>הוסף את הארוחה הראשונה כדי להתחיל לעקוב.</small>
            </div>
          ) : (
            <div className="meal-list">
              {[...state.today.meals.filter((meal: any) => !meal.beverageEntry).map((meal: any) => ({ ...meal, kind: "meal" })), ...(state.today.waterEvents || []).map((water: any) => ({ ...water, kind: "water" }))]
                .sort((a, b) => String(a.time).localeCompare(String(b.time)))
                .map((meal: any) => meal.kind === "water" ? (
                  <article className="water-timeline-entry" key={`water-${meal.id}`}>
                    <span className="meal-icon water"><AppIcon name="water" /></span>
                    <div><span className="meal-meta"><time>{new Date(meal.time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</time><em>שתייה</em>{meal.pendingSync && <em className="pending-sync">ממתין לסנכרון</em>}</span><strong>{meal.beverageName || "כוס מים"}</strong><small>{Number(meal.amount || 250).toLocaleString()} מ״ל{meal.hydrationMl && Number(meal.hydrationMl) !== Number(meal.amount) ? ` · ${Number(meal.hydrationMl).toLocaleString()} מ״ל למיכל` : ""}</small></div>
                    <b>{Math.max(1, Math.round(Number(meal.amount || 250) / 250))}<small> כוסות</small></b>
                  </article>
                ) : (
                  <article key={`meal-${meal.id}`}>
                    <button type="button" className="meal-visual-button" onClick={() => setMealPreview(meal)} aria-label={`הצגת פרטי ${meal.name}`}>
                      {meal.image ? (
                        <img className="meal-thumb" src={meal.image} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className={`meal-icon meal-${meal.period || "snack"}`}>🍽</span>
                      )}
                    </button>
                    <div>
                      <span className="meal-meta">
                        <time>
                          {new Date(meal.time).toLocaleTimeString("he-IL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                        <em>{periodLabels[meal.period || "snack"]}</em>
                        {meal.pendingSync && <em className="pending-sync">ממתין לסנכרון</em>}
                      </span>
                      <strong>{meal.name}</strong>
                      <small>
                        {meal.protein}g חלבון · {meal.carbs}g פחמימות ·{" "}
                        {meal.fat}g שומן
                      </small>
                    </div>
                    <b>
                      {meal.kcal}
                      <small> kcal</small>
                    </b>
                    <button
                      className="meal-edit"
                      onClick={() => editMeal(meal)}
                      aria-label={`עריכת ${meal.name}`}
                    >
                      <AppIcon name="edit" /> עריכה
                    </button>
                  </article>
                ))}
            </div>
          )}
          <button className="food-library-tile" onClick={() => setFoodLibraryOpen(true)}>
              <span>▦</span>
              <div>
                <strong>המועדפים שלי</strong>
                <small>{state.favorites?.length || 0} ארוחות שמורות · הוספה מהירה והסרה מהמועדפים</small>
              </div>
              <b>←</b>
          </button>
        </div>
        </div><div className="side-stack">
          <section className="panel water-panel hydration-panel">
            <header>
              <div><p className="eyebrow">מיכל שתייה יומי</p><h2>שתייה היום</h2></div>
              <button className="water-edit" onClick={openWaterEditor} aria-label="הוספת משקה">
                <b>＋</b><span>הוספת משקה</span>
              </button>
            </header>
            <div className="hydration-total"><div className="water-progress"><i style={{ width: `${Math.min(100, (state.today.waterMl / profile.waterMl) * 100)}%` }} /></div><strong>{Math.round((state.today.waterMl / Math.max(1, profile.waterMl)) * 100)}%</strong></div>
            <p>{state.today.waterMl.toLocaleString()} מתוך {profile.waterMl.toLocaleString()} מ״ל נוזלים</p>
            <div className="daily-hydration-pitcher" aria-label="הרכב השתייה היום"><div className="hydration-pitcher"><div className="hydration-liquid">{dailyHydrationLayers.slice().reverse().map((item, index) => <i key={item.id} title={`${item.name}: ${item.contribution} מ״ל`} style={{ height: `${Math.min(100, item.contribution / Math.max(1, dailyHydrationTotal) * 100)}%`, "--layer-color": item.color, "--layer-delay": `${index * 90}ms` } as CSSProperties} />)}</div></div><div>{dailyHydrationLayers.length ? dailyHydrationLayers.map((item) => <span key={item.id}><b>{item.icon} {item.name}</b><small>{item.contribution.toLocaleString()} מ״ל למיכל</small></span>) : <span><b>המיכל עדיין ריק</b><small>הוסף משקה כדי להתחיל</small></span>}</div></div>
            <div className="beverage-bars">{hydrationRows.map((beverage) => <article key={beverage.id} style={{ "--beverage-color": beverage.color } as CSSProperties}><header><span>{beverage.icon}</span><div><strong>{beverage.name}</strong><small>{beverage.amount.toLocaleString()} מ״ל{beverage.factor < 1 && beverage.amount > 0 ? ` · ${beverage.contribution.toLocaleString()} מ״ל למיכל` : ""}</small></div></header><div className="water-control-row" dir="ltr"><button onClick={() => addWater(-beverage.defaultAmount, beverage.id)} disabled={beverage.removableAmount <= 0} aria-label={`ביטול המנה האחרונה של ${beverage.name}`}>−</button><div className="water-progress"><i style={{ width: `${Math.min(100, beverage.contribution / profile.waterMl * 100)}%` }} /></div><button onClick={() => addWater(beverage.defaultAmount, beverage.id)} aria-label={`הוספת ${beverage.name}`}>+</button></div></article>)}</div>
          </section>
          <button type="button" className="panel trends-tile" onClick={openInsights}>
            <span><AppIcon name="activity" /></span>
            <div><strong>מגמות</strong><small>{latestWeightDelta === null ? `ציון היום ${dailyScore}/100 · הוסף מדידת משקל למעקב` : `${latestWeightDelta > 0 ? "עלייה" : latestWeightDelta < 0 ? "ירידה" : "ללא שינוי"} של ${Math.abs(latestWeightDelta).toFixed(1)} ק״ג · ציון היום ${dailyScore}/100`}</small></div>
            <b>←</b>
          </button>
          <section className="panel insights-panel">
            <header>
              <div>
                <p className="eyebrow">{coachIsFemale ? "המלצת המאמנת" : "המלצת המאמן"}</p>
                <h2>{coachRecommendationTitle}</h2>
              </div>
            </header>
            <div className="daily-insights">
              {dailyInsights.slice(0, 3).map((item: any) => (
                <article key={item.title}>
                  <i><AppIcon name={item.title.includes("שתייה") ? "water" : "coach"} /></i>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </div>
                </article>
              ))}
            </div>
            <footer className="tracking-actions">
              <button onClick={() => setActivityOpen(true)}><AppIcon name="activity" /> פעילות</button>
              <button onClick={() => setCoachOpen(true)}><AppIcon name="coach" /> שאל את {coachRole}</button>
            </footer>
          </section>
        </div>
      </section>
      <nav className="bottom-nav">
        <button aria-label="היום" title="היום" className={!historyOpen && !settingsOpen && !adminLoginOpen && !insightsOpen && !coachOpen ? "active" : ""} onClick={() => openNavigationScreen("home")}>
          <span><AppIcon name="home" /></span><span className="nav-label">היום</span>
        </button>
        <button aria-label="היסטוריה" title="היסטוריה" className={historyOpen ? "active" : ""} onClick={() => openNavigationScreen("history")}>
          <span><AppIcon name="history" /></span><span className="nav-label">היסטוריה</span>
        </button>
        <button
          className="nav-camera"
          onClick={() => { setQuickCategory(""); setQuickAddOpen(true); }}
          aria-label="פתיחת תפריט הוספת ארוחה"
        >
          <AppIcon name="mealAdd" />
        </button>
        <button aria-label="מגמות" title="מגמות" className={insightsOpen ? "active" : ""} onClick={() => openNavigationScreen("insights")}>
          <span><AppIcon name="activity" /></span>
          <span className="nav-label">מגמות</span>
        </button>
        <button aria-label={coachIsFemale ? "מאמנת" : "מאמן"} title={coachIsFemale ? "מאמנת" : "מאמן"} className={coachOpen ? "active" : ""} onClick={() => openNavigationScreen("coach")}>
          <span><AppIcon name="coach" /></span><span className="nav-label">{coachIsFemale ? "מאמנת" : "מאמן"}</span>
        </button>
      </nav>
      {calorieOverage && <div className="modal-layer overage-layer"><button className="backdrop" onClick={() => setCalorieOverage(null)} /><section className="settings-modal overage-modal"><header><div><h2>חריגה מהיעד היומי</h2><small>הארוחה נשמרה, אבל אפשר עדיין לתקן את הבחירה</small></div></header><div className="overage-ring"><strong>+{Math.round(calorieOverage.overBy)}</strong><small>קלוריות מעל היעד</small></div><p>אין צורך להילחץ מיום אחד. אפשר להשאיר את הארוחה, לערוך כמויות או לבטל את ההוספה.</p><footer><button type="button" onClick={() => setCalorieOverage(null)}>השאר ביומן</button><button type="button" onClick={() => { const meal = calorieOverage.meal; setCalorieOverage(null); editMeal({ ...meal, id: calorieOverage.id, time: meal.occurredAt }); }}>ערוך ארוחה</button><button className="danger" type="button" onClick={async () => { await deleteMeal(calorieOverage.id); setCalorieOverage(null); }}>בטל את ההוספה</button></footer></section></div>}
      {dayCloseConfirm && <div className="modal-layer"><button className="backdrop" onClick={() => setDayCloseConfirm(false)} /><section className="settings-modal compact-modal finish-day-modal"><header><div><h2>לסיים את היום הפעיל?</h2><small>היום יישמר בהיסטוריה והמדדים יתחילו מחדש</small></div></header><div className="finish-day-summary"><span><small>קלוריות</small><strong>{consumed.toLocaleString()}</strong></span><span><small>ארוחות</small><strong>{state.today.meals.filter((meal: any) => !meal.beverageEntry).length}</strong></span><span><small>שתייה</small><strong>{Number(state.today.waterMl || 0).toLocaleString()} מ״ל</strong></span></div><p>הפעולה אינה מוחקת דבר. אפשר יהיה לפתוח את היום הזה מההיסטוריה.</p><footer><button type="button" onClick={() => setDayCloseConfirm(false)}>חזור</button><button className="primary" type="button" disabled={busy} onClick={finishActiveDay}>{busy ? "שומר…" : "סיים והתחל יום חדש"}</button></footer></section></div>}
      {cameraCaptureOpen && <div className="modal-layer meal-camera-layer"><button className="backdrop" type="button" onClick={closeInAppCamera} aria-label="סגירת המצלמה" /><section className="settings-modal meal-camera-modal"><header><div><h2>צילום ארוחה</h2><p>מקם את כל הצלחת בפריים ובתאורה טובה</p></div><button type="button" onClick={closeInAppCamera} aria-label="סגור">×</button></header><div className="live-meal-camera"><video ref={mealCameraVideo} playsInline muted /><span><AppIcon name="target" /></span></div><p className="camera-status" role="status">{cameraStatus}</p><label>פרט שיעזור בזיהוי <input value={cameraHint} onChange={(event) => setCameraHint(event.target.value)} maxLength={300} placeholder="לא חובה — למשל: חזה עוף עם מעט שמן" /></label><footer><button type="button" onClick={() => { closeInAppCamera(); uploadInput.current?.click(); }}>בחר מהגלריה</button><button className="primary camera-shutter" type="button" onClick={captureInAppMeal} aria-label="צלם ונתח"><AppIcon name="camera" /> צלם ונתח</button></footer></section></div>}
      {historyDeleteRequest && <div className="modal-layer modal-nested"><button className="backdrop" type="button" onClick={() => setHistoryDeleteRequest(null)} /><form className="settings-modal compact-modal history-password-modal" onSubmit={async (event) => { event.preventDefault(); if (!historyDeleteRequest.password) return; await performHistoryDelete("meal", historyDeleteRequest.id, historyDeleteRequest.date, historyDeleteRequest.password); }}><header><div><h2>מחיקת ארוחה מההיסטוריה</h2><p>המחיקה תעדכן מיד את הקלוריות, אבות המזון והציון.</p></div></header><label>הסיסמה הנוכחית<input type="password" autoComplete="current-password" value={historyDeleteRequest.password} onChange={(event) => setHistoryDeleteRequest({ ...historyDeleteRequest, password: event.target.value })} /></label><footer><button type="button" onClick={() => setHistoryDeleteRequest(null)}>ביטול</button><button className="danger" type="submit" disabled={!historyDeleteRequest.password}>המשך למחיקה</button></footer></form></div>}
      {mealPreview && (
        <div className="modal-layer meal-preview-layer">
          <button className="backdrop" onClick={closeMealPreview} aria-label="סגירת פרטי הארוחה" />
          <section className="settings-modal meal-preview-modal">
            <header><div><h2>{mealPreview.name}</h2><small>{periodLabels[mealPreview.period || "snack"]} · {new Date(mealPreview.time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</small></div><button onClick={closeMealPreview}>×</button></header>
            {mealPreview.image ? <img className="meal-preview-image" src={mealPreview.image} alt={mealPreview.name} /> : <div className="meal-preview-placeholder">🍽</div>}
            {Number(mealPreview.recognitionScore) > 0 && <div className={`meal-preview-recognition ${Number(mealPreview.recognitionScore) >= 85 ? "high" : Number(mealPreview.recognitionScore) >= 60 ? "medium" : "low"}`}><span><small>ציון הזיהוי בעת ההוספה</small><strong>{Math.round(Number(mealPreview.recognitionScore))}/100</strong></span><p>{Number(mealPreview.recognitionScore) >= 85 ? "הזיהוי היה ברור" : Number(mealPreview.recognitionScore) >= 60 ? "הזיהוי טוב, אך הכמות הוערכה" : "הזיהוי נשמר לאחר בדיקת המשתמש"}</p></div>}
            <div className="meal-preview-values"><span className="calories"><small>קלוריות</small><strong>{mealPreview.kcal}</strong></span><span className="protein"><small>חלבון</small><strong>{mealPreview.protein} גרם</strong></span><span className="carbs"><small>פחמימות</small><strong>{mealPreview.carbs} גרם</strong></span><span className="fat"><small>שומן</small><strong>{mealPreview.fat} גרם</strong></span></div>
            {Array.isArray(mealPreview.items) && mealPreview.items.length > 0 && <div className="meal-preview-items"><strong>מרכיבי הארוחה</strong>{mealPreview.items.map((item: any, index: number) => <span key={`${item.name}-${index}`}><b>{item.name}</b><small>{item.grams ? `${item.grams} גרם` : item.quantity ? `כמות ${item.quantity}` : ""}</small></span>)}</div>}
            <footer><button type="button" onClick={() => addMealToFavorites(mealPreview.id)} disabled={state.favorites?.some((favorite) => favorite.meal.name === mealPreview.name)}>{state.favorites?.some((favorite) => favorite.meal.name === mealPreview.name) ? "כבר במועדפים" : "הוסף למועדפים"}</button><button className="primary" type="button" onClick={closeMealPreview}>{mealPreviewReturnToHistory ? "חזרה להיסטוריה" : mealPreviewReturnToInsights ? "חזרה למגמות" : "חזרה למה אכלתי היום"}</button></footer>
          </section>
        </div>
      )}
      {coachOpen && (
        <div className="coach-layer">
          <button className="backdrop" onClick={() => setCoachOpen(false)} />
          <aside className="coach-sheet">
            <header>
              <div className={`coach-avatar ${coachIsFemale ? "female" : "male"}`}><img src={coachIsFemale ? "/coach-avatar-female.webp" : "/coach-avatar-male.webp"} alt={coachIsFemale ? "אווטאר המאמנת" : "אווטאר המאמן"} /><b>{coachDisplayName}</b></div>
              <div>
                <strong>{coachDisplayName} · {coachIsFemale ? "המאמנת האישית שלך" : "המאמן האישי שלך"}</strong>
                <small>
                  <i /> כאן איתך, בקצב שלך
                </small>
              </div>
              <div className="coach-header-actions">
                <button className={`coach-help-toggle ${coachHelpOpen ? "active" : ""}`} onClick={() => setCoachHelpOpen((open) => !open)} title="שאלות לדוגמה ועזרה בשימוש" aria-label="פתיחת שאלות ועזרה"><AppIcon name="info" /></button>
                <button className="clear-chat" onClick={clearCoachDisplay} title="ניקוי התצוגה בלבד; ההיסטוריה נשמרת בזיכרון המאמן והמלל לא יחזור">נקה מסך</button>
                <button onClick={() => setCoachOpen(false)} aria-label="סגירת המאמן">×</button>
              </div>
            </header>
            {coachHelpOpen && <section className="coach-help-panel"><header><div><strong>איך אפשר לעזור?</strong><small>בחר שאלה, ערוך אותה אם צריך ושלח</small></div><button type="button" onClick={() => setCoachHelpOpen(false)} aria-label="סגירת העזרה">×</button></header><div><section><strong>שאלות למאמן</strong>{coachHelpQuestions.coach.map((question) => <button type="button" key={question} onClick={() => { setMessage(question); setCoachHelpOpen(false); }}>{question}</button>)}</section><section><strong>עזרה בשימוש באפליקציה</strong>{coachHelpQuestions.app.map((question) => <button type="button" key={question} onClick={() => { setMessage(question); setCoachHelpOpen(false); }}>{question}</button>)}</section></div></section>}
            <div className="chat-feed">
              {messages.length === 0 && (
                <div className="coach-message">
                  {state.owner.name}, מה יעזור לך עכשיו? אפשר להתייעץ, לחשוב יחד על הארוחה הבאה או פשוט לבדוק איך היום מתקדם.
                </div>
              )}
              {messages.map((item, index) => (
                <div key={index} className={`chat-message-row ${item.role}`}>
                  <div className={`chat-avatar ${item.role === "user" ? "user" : coachIsFemale ? "coach female" : "coach male"}`}>
                    {item.role === "user" && profile?.avatar ? <img src={profile.avatar} alt={state.owner.name} /> : item.role === "user" ? <AppIcon name="user" /> : <img src={coachIsFemale ? "/coach-avatar-female.webp" : "/coach-avatar-male.webp"} alt={coachIsFemale ? "המאמנת" : "המאמן"} />}
                  </div>
                  <div className={`chat-message ${item.role}`}>
                    <span>{item.text}</span>
                    {item.role === "assistant" && <button type="button" className={`message-speak ${coachSpeaking || coachSpeechPending ? "speaking" : ""}`} onClick={() => coachSpeaking || coachSpeechPending ? stopCoachSpeech() : speakCoachReply(item.text)} aria-label={coachSpeaking || coachSpeechPending ? "עצירת ההקראה" : "הקראת התשובה שנכתבה"} title="אפשר להקשיב גם לתשובה שהתקבלה אחרי הודעת טקסט"><AppIcon name="speaker" />{coachSpeechPending ? "מכין קול" : coachSpeaking ? "עצור" : "הקרא תשובה"}</button>}
                  </div>
                </div>
              ))}
              {busy && <div className="typing">חושב…</div>}
            </div>
            {(coachListening || coachTranscribing || coachSpeechPending || coachSpeaking || busy) && <div className={`coach-voice-status ${coachListening ? "listening" : coachSpeaking ? "speaking" : "thinking"}`} role="status"><span>{coachListening ? "אני מקשיב — לחץ שוב כדי לשלוח" : coachTranscribing ? "מבין את ההודעה שלך…" : coachSpeechPending ? "מכין תשובה קולית אחת…" : coachSpeaking ? `${coachRole} עונה בקול ${coachVoice === "female" ? "נשי" : "גברי"}…` : `שולח ל${coachRole} ומכין תשובה…`}</span>{(coachListening || coachSpeechPending || coachSpeaking) && <button type="button" onClick={() => coachListening ? stopCoachListening() : stopCoachSpeech()}>{coachListening ? "שלח" : "עצור"}</button>}</div>}
            <form onSubmit={sendMessage}>
              <button type="button" disabled={busy || coachTranscribing} className={`coach-dictation ${coachListening ? "listening" : ""}`} onClick={() => coachListening ? stopCoachListening() : startCoachDictation()} aria-label={coachListening ? "עצירה ושליחת ההודעה" : "התחלת הודעה קולית"} title={coachListening ? "לחץ כדי לעצור ולשלוח" : "לחץ כדי לדבר"}><AppIcon name="mic" /><span>{coachListening ? "שלח" : "דבר"}</span></button>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={coachListening ? "מקשיב לך…" : "כתוב או לחץ על המיקרופון ודבר…"}
              />
              <button disabled={busy}>↑</button>
            </form>
            <p className="ai-note">מידע כללי בלבד · לא ייעוץ רפואי</p>
          </aside>
        </div>
      )}
      {adminLoginOpen && (
        <div className="modal-layer">
          <button
            className="backdrop"
            onClick={() => setAdminLoginOpen(false)}
          />
          <form className="settings-modal admin-login" onSubmit={loginAdmin}>
            <header>
              <div>
                <p className="eyebrow">גישה מוגנת</p>
                <h2>
                  {state.adminConfigured
                    ? "כניסת ADMIN"
                    : "הגדרת ADMIN ראשונית"}
                </h2>
              </div>
              <button type="button" onClick={() => setAdminLoginOpen(false)}>
                ×
              </button>
            </header>
            <p>
              {state.adminConfigured
                ? "הזן את סיסמת המנהל כדי לפתוח את הגדרות המערכת."
                : "צור סיסמה למנהל. הנתונים הקיימים יישמרו ללא שינוי."}
            </p>
            <div className="field-stack">
              <label>
                סיסמת Admin
                <input
                  type="password"
                  minLength={10}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete={
                    state.adminConfigured ? "current-password" : "new-password"
                  }
                />
              </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <footer>
              <button type="button" onClick={() => setAdminLoginOpen(false)}>
                ביטול
              </button>
              <button
                className="primary"
                disabled={busy || adminPassword.length < 10}
              >
                {busy
                  ? "מתחבר…"
                  : state.adminConfigured
                    ? "כניסה"
                    : "צור ADMIN"}
              </button>
            </footer>
          </form>
        </div>
      )}
      {settingsOpen && isAdmin && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setSettingsOpen(false)} />
          <section
            className={`settings-modal admin-center admin-tab-${adminTab}`}
          >
            <header>
              <div>
                <p className="eyebrow">CALOREAZI ADMIN</p>
                <h2>מרכז ניהול</h2>
                <small className="admin-header-help">הגדרות, ניטור ותחזוקת המערכת במקום אחד</small>
              </div>
              <span className="admin-badge">ADMIN</span>
              {adminHealth && <span className="admin-version">גרסה {adminHealth.version}<small>{adminHealth.build === "development" ? "פיתוח" : adminHealth.build?.slice(0, 7)}</small></span>}
              <button onClick={() => setSettingsOpen(false)}>×</button>
            </header>
            <div className="admin-workspace">
            <label className="admin-mobile-nav">
              <span><AppIcon name="settings" /><small>אזור ניהול</small></span>
              <select
                value={adminTab}
                aria-label="בחירת אזור במרכז הניהול"
                onChange={(event) => {
                  const nextTab = event.target.value as typeof adminTab;
                  if (nextTab === "trash") void openTrash();
                  else setAdminTab(nextTab);
                }}
              >
                <optgroup label="מערכת">
                  <option value="ai">AI ומודלים</option>
                  <option value="users">ניהול משתמשים</option>
                  <option value="security">אבטחה וגישה</option>
                </optgroup>
                <optgroup label="מידע ותחזוקה">
                  <option value="storage">אחסון ומדיה</option>
                  <option value="database">מסד נתונים</option>
                  <option value="backups">גיבויים ושחזור</option>
                  <option value="audit">יומן פעילות</option>
                  <option value="trash">סל מחזור</option>
                </optgroup>
              </select>
            </label>
            <nav className="admin-nav">
              <button
                className={adminTab === "ai" ? "active" : ""}
                onClick={() => setAdminTab("ai")}
              >
                <AppIcon name="sparkles" /><span><strong>AI ומודלים</strong><small>ספקים, מודלים ועלויות</small></span>
              </button>
              <button
                className={adminTab === "users" ? "active" : ""}
                onClick={() => setAdminTab("users")}
              >
                <AppIcon name="user" /><span><strong>משתמשים</strong><small>חשבונות והרשאות</small></span>
              </button>
              <button
                className={adminTab === "security" ? "active" : ""}
                onClick={() => setAdminTab("security")}
              >
                <AppIcon name="lock" /><span><strong>אבטחה</strong><small>סיסמאות וגישה</small></span>
              </button>
              <button
                className={adminTab === "storage" ? "active" : ""}
                onClick={() => setAdminTab("storage")}
              >
                <AppIcon name="image" /><span><strong>אחסון ומדיה</strong><small>נפח ומדיניות תמונות</small></span>
              </button>
              <button
                className={adminTab === "database" ? "active" : ""}
                onClick={() => setAdminTab("database")}
              >
                <AppIcon name="list" /><span><strong>מסד נתונים</strong><small>מצב ותחזוקה</small></span>
              </button>
              <button
                className={adminTab === "backups" ? "active" : ""}
                onClick={() => setAdminTab("backups")}
              >
                <AppIcon name="history" /><span><strong>גיבויים</strong><small>יצירה ושחזור</small></span>
              </button>
              <button
                className={adminTab === "audit" ? "active" : ""}
                onClick={() => setAdminTab("audit")}
              >
                <AppIcon name="activity" /><span><strong>יומן מערכת</strong><small>פעולות ואירועים</small></span>
              </button>
              <button className={adminTab === "trash" ? "active" : ""} onClick={() => void openTrash()}><AppIcon name="history" /><span><strong>סל מחזור</strong><small>שחזור ומחיקה</small></span></button>
            </nav>
            <main className="admin-content">
            <div className="admin-page-heading">
              <div>
                <p className="eyebrow">{adminTab === "ai" ? "בינה מלאכותית" : adminTab === "users" ? "גישה למערכת" : adminTab === "security" ? "אבטחה" : adminTab === "storage" ? "אחסון" : adminTab === "database" ? "תשתית" : adminTab === "backups" ? "הגנת מידע" : adminTab === "audit" ? "ניטור" : "שחזור"}</p>
                <h3>{adminTab === "ai" ? "AI ומודלים" : adminTab === "users" ? "ניהול משתמשים" : adminTab === "security" ? "הגדרות אבטחה" : adminTab === "storage" ? "אחסון ומדיה" : adminTab === "database" ? "מסד נתונים" : adminTab === "backups" ? "גיבויים ושחזור" : adminTab === "audit" ? "יומן פעילות" : "סל מחזור"}</h3>
              </div>
              {adminHealth && <span className={adminHealth.ai === "configured" ? "admin-system-state ok" : "admin-system-state warn"}><i />{adminHealth.ai === "configured" ? "המערכת פעילה" : "נדרשת בדיקה"}</span>}
            </div>
            {adminTab === "ai" && adminHealth && (
              <section className="health-grid">
                <article>
                  <span className="health-ok">●</span>
                  <small>Application</small>
                  <strong>תקין</strong>
                </article>
                <article>
                  <span className="health-ok">●</span>
                  <small>Database</small>
                  <strong>{adminHealth.meals} ארוחות</strong>
                </article>
                <article>
                  <span
                    className={
                      adminHealth.ai === "configured"
                        ? "health-ok"
                        : "health-warn"
                    }
                  >
                    ●
                  </span>
                  <small>AI</small>
                  <strong>
                    {adminHealth.ai === "configured" ? "מחובר" : "דורש הגדרה"}
                  </strong>
                </article>
                <article>
                  <span className="health-ok">●</span>
                  <small>משתמשים</small>
                  <strong>
                    {adminHealth.activeUsers}/{adminHealth.users} פעילים
                  </strong>
                </article>
                <article>
                  <span className="health-ok">●</span>
                  <small>בקשות AI החודש</small>
                  <strong>{adminHealth.aiRequests}</strong>
                </article>
                <article>
                  <span className="health-ok">●</span>
                  <small>עלות AI משוערת</small>
                  <strong>
                    ${Number(adminHealth.estimatedAiCost).toFixed(4)}
                  </strong>
                </article>
                <article><span className="health-ok">●</span><small>Sessions פעילים</small><strong>{adminHealth.activeSessions}</strong></article>
                <article><span className={adminHealth.analysisJobs?.failed ? "health-warn" : "health-ok"}>●</span><small>תור ניתוח AI</small><strong>{adminHealth.analysisJobs?.pending || 0} ממתינים · {adminHealth.analysisJobs?.failed || 0} נכשלו</strong></article>
                <article><span className={adminHealth.trashItems ? "health-warn" : "health-ok"}>●</span><small>סל מחזור</small><strong>{adminHealth.trashItems || 0} פריטים</strong></article>
              </section>
            )}
            {adminTab === "ai" && adminHealth?.quality && <section className="quality-metrics-panel"><header><div><strong>בקרת ביצוע ואיכות</strong><small>מדדים מצטברים מהשימוש בפועל — ללא חשיפת תוכן אישי</small></div></header><div>
              <article><small>זמן הוספה ממוצע</small><strong>{adminHealth.quality.averageAddSeconds == null ? "נאסף מעכשיו" : `${adminHealth.quality.averageAddSeconds} שנ׳`}</strong></article>
              <article><small>זיהויים שאושרו ללא תיקון</small><strong>{adminHealth.quality.recognitionApprovalRate == null ? "אין נתונים" : `${adminHealth.quality.recognitionApprovalRate}%`}</strong></article>
              <article><small>שיעור תיקונים</small><strong>{adminHealth.quality.correctionRate == null ? "אין נתונים" : `${adminHealth.quality.correctionRate}%`}</strong></article>
              <article><small>ארוחות באמינות גבוהה</small><strong>{adminHealth.quality.highReliabilityRate == null ? "אין נתונים" : `${adminHealth.quality.highReliabilityRate}%`}</strong></article>
              <article><small>כפילויות שנחסמו</small><strong>{adminHealth.quality.duplicateBlocks}</strong></article>
              <article><small>עלות AI ממוצעת לארוחה</small><strong>${Number(adminHealth.quality.aiCostPerMeal || 0).toFixed(4)}</strong></article>
              <article><small>עלות AI למשתמש פעיל החודש</small><strong>${Number(adminHealth.quality.aiCostPerActiveUser || 0).toFixed(4)}</strong></article>
            </div></section>}
            <div className="admin-intro" id="admin-ai">
              <strong>הגדרת AI גלובלית</strong>
              <span>
                הספק, המודל והמפתח משמשים את כל המשתמשים. למשתמש רגיל אין גישה
                להגדרות אלה.
              </span>
            </div>
            <div className="settings-grid">
              <label>
                ספק
                <select
                  value={aiForm.provider}
                  onChange={(e) => {
                    const first = modelCatalog[e.target.value]?.[0];
                    const firstImage = imageModelCatalog[e.target.value]?.[0];
                    setAiForm({
                      ...aiForm,
                      provider: e.target.value,
                      ...(first
                        ? {
                            model: first.id,
                            coachModel: first.id,
                            visionModel: first.id,
                            inputCost: first.inputCost,
                            outputCost: first.outputCost,
                          }
                        : {}),
                      ...(firstImage ? { imageModel: firstImage.id } : {}),
                    });
                  }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </label>
              <label>
                מודל המאמן האישי
                <select
                  value={aiForm.coachModel}
                  onChange={(e) => {
                    const selected = modelCatalog[aiForm.provider]?.find(
                      (item) => item.id === e.target.value,
                    );
                    if (selected)
                      setAiForm({
                        ...aiForm,
                        model: selected.id,
                        coachModel: selected.id,
                        inputCost: selected.inputCost,
                        outputCost: selected.outputCost,
                      });
                  }}
                >
                  {modelCatalog[aiForm.provider]?.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.recommended ? "★ מומלץ · " : ""}
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                מודל זיהוי ארוחה
                <select
                  value={aiForm.visionModel}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, visionModel: e.target.value })
                  }
                >
                  {modelCatalog[aiForm.provider]
                    ?.filter((model) => model.vision)
                    .map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.recommended ? "★ מומלץ · " : ""}
                        {model.label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                מודל יצירת תמונות
                <select
                  value={aiForm.imageModel}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, imageModel: e.target.value })
                  }
                >
                  {imageModelCatalog[aiForm.provider]?.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.recommended ? "★ מומלץ · " : ""}
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>גיבוי למאמן<select value={aiForm.coachFallbackModel} onChange={(e) => setAiForm({ ...aiForm, coachFallbackModel: e.target.value })}><option value="">ללא מודל גיבוי</option>{modelCatalog[aiForm.provider]?.filter((model) => model.id !== aiForm.coachModel).map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>
              <label>גיבוי לזיהוי ארוחה<select value={aiForm.visionFallbackModel} onChange={(e) => setAiForm({ ...aiForm, visionFallbackModel: e.target.value })}><option value="">ללא מודל גיבוי</option>{modelCatalog[aiForm.provider]?.filter((model) => model.vision && model.id !== aiForm.visionModel).map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>
              <label>גיבוי ליצירת תמונות<select value={aiForm.imageFallbackModel} onChange={(e) => setAiForm({ ...aiForm, imageFallbackModel: e.target.value })}><option value="">ללא מודל גיבוי</option>{imageModelCatalog[aiForm.provider]?.filter((model) => model.id !== aiForm.imageModel).map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>
              <div className="model-explanation wide">
                <strong>שלושה תפקידים נפרדים</strong>
                <span>
                  המאמן משמש לשיחה והמלצות, מודל הזיהוי מנתח תמונות ארוחה, ומודל
                  התמונה יוצר איורים לקטלוג.
                </span>
                <small>
                  השימוש והעלות נרשמים לפי התפקיד והמודל שביצע את הפעולה.
                </small>
              </div>
              <label className="wide">
                API Key
                <input
                  type="password"
                  value={aiForm.apiKey}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, apiKey: e.target.value })
                  }
                  placeholder={
                    state.ai.keyConfigured
                      ? "מפתח שמור — השאר ריק כדי לשמור עליו"
                      : "הדבק מפתח API"
                  }
                />
              </label>
              <label>
                עלות input למיליון tokens
                <input
                  type="number"
                  step="0.01"
                  value={aiForm.inputCost}
                  readOnly
                />
              </label>
              <label>
                עלות output למיליון tokens
                <input
                  type="number"
                  step="0.01"
                  value={aiForm.outputCost}
                  readOnly
                />
              </label>
              <label>
                תקציב חודשי גלובלי משוער ($)
                <input
                  type="number"
                  value={aiForm.monthlyBudget}
                  onChange={(e) =>
                    setAiForm({
                      ...aiForm,
                      monthlyBudget: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                התראה ב־%
                <input
                  type="number"
                  value={aiForm.softLimit}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, softLimit: Number(e.target.value) })
                  }
                />
              </label>
              <label className="wide"><span>מצב חיסכון קשיח</span><select value={aiForm.economyMode ? "on" : "off"} onChange={(e) => setAiForm({ ...aiForm, economyMode: e.target.value === "on", monthlyBudget: e.target.value === "on" ? Math.min(2, Number(aiForm.monthlyBudget) || 2) : aiForm.monthlyBudget })}><option value="on">פעיל — עד $2, תמונות מהמאגר וקול מהמכשיר</option><option value="off">כבוי — מאפשר שירותי ענן יקרים</option></select><small>במצב חיסכון תמונות AI וקול ענן לא מופעלים אוטומטית.</small></label>
              {!aiForm.economyMode && <><label><span>יצירת תמונות AI אוטומטית</span><select value={aiForm.autoGenerateMealImages ? "on" : "off"} onChange={(e) => setAiForm({ ...aiForm, autoGenerateMealImages: e.target.value === "on" })}><option value="off">כבוי</option><option value="on">פעיל</option></select></label><label><span>קול ענן</span><select value={aiForm.cloudTtsEnabled ? "on" : "off"} onChange={(e) => setAiForm({ ...aiForm, cloudTtsEnabled: e.target.value === "on" })}><option value="off">כבוי</option><option value="on">פעיל</option></select></label></>}
            </div>
            <section className="admin-users" id="admin-security">
              <div className="admin-section-title">
                <div>
                  <p className="eyebrow">אבטחה</p>
                  <h3>החלפת סיסמת ADMIN</h3>
                </div>
              </div>
              <form className="new-user-form" onSubmit={changeAdminPassword}>
                <div className="settings-grid">
                  <label>
                    סיסמה נוכחית
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    סיסמה חדשה
                    <input
                      type="password"
                      minLength={10}
                      autoComplete="new-password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="wide">
                    אימות סיסמה חדשה
                    <input
                      type="password"
                      minLength={10}
                      autoComplete="new-password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !passwordForm.currentPassword ||
                    passwordForm.newPassword.length < 10 ||
                    !passwordForm.confirmPassword
                  }
                >
                  החלף סיסמה
                </button>
              </form>
            </section>
            <div className="usage-summary">
              <span>שימוש גלובלי משוער החודש</span>
              <strong>
                ${usage.toFixed(4)} / ${Number(aiForm.monthlyBudget).toFixed(2)}
              </strong>
              <small>
                {state.aiUsage.length} בקשות מכל המשתמשים · המפתח מוצפן
                ב־backend
              </small>
            </div>
            <section className="admin-users" id="admin-users">
              <div className="admin-section-title">
                <div>
                  <p className="eyebrow">גישה למערכת</p>
                  <h3>משתמשים</h3>
                </div>
                <span>{adminUsers.length} חשבונות</span>
              </div>
              <div className="user-list">
                {adminUsers.map((user) => (
                  <article key={user.id}>
                    <div>
                      <strong>{user.name}</strong>
                      <small>
                        {user.email} ·{" "}
                        {user.lastLogin
                          ? `כניסה אחרונה ${new Date(user.lastLogin).toLocaleDateString("he-IL")}`
                          : "טרם התחבר"}
                      </small>
                    </div>
                    <span
                      className={
                        user.role === "admin" ? "admin-role" : "user-role"
                      }
                    >
                      {user.disabled ? "מושבת" : user.role.toUpperCase()}
                    </span>
                    {user.role !== "admin" && (
                      <button
                        className="user-toggle"
                        onClick={async () => {
                          try {
                            await api("/api/admin/users", {
                              method: "PATCH",
                              body: JSON.stringify({
                                id: user.id,
                                disabled: !user.disabled,
                              }),
                            });
                            await loadAdminData();
                          } catch (e) {
                            setAiStatus((e as Error).message);
                          }
                        }}
                      >
                        {user.disabled ? "הפעל" : "השבת"}
                      </button>
                    )}
                    <details className="admin-user-credentials">
                      <summary>עדכון פרטי התחברות</summary>
                      <label>
                        אימייל
                        <input
                          type="email"
                          value={adminUserEdits[user.id]?.email ?? user.email ?? ""}
                          onChange={(event) => setAdminUserEdits((current) => ({ ...current, [user.id]: { email: event.target.value, password: current[user.id]?.password || "" } }))}
                        />
                      </label>
                      <label>
                        סיסמה חדשה (אופציונלי)
                        <input
                          type="password"
                          minLength={10}
                          autoComplete="new-password"
                          value={adminUserEdits[user.id]?.password || ""}
                          onChange={(event) => setAdminUserEdits((current) => ({ ...current, [user.id]: { email: current[user.id]?.email ?? user.email ?? "", password: event.target.value } }))}
                        />
                      </label>
                      <button
                        className="primary"
                        type="button"
                        disabled={busy || !(adminUserEdits[user.id]?.email ?? user.email)}
                        onClick={() => updateAdminUserCredentials(user)}
                      >
                        שמור מייל ו/או סיסמה
                      </button>
                      <small>שינוי ינתק את ההפעלות הפעילות של המשתמש מטעמי אבטחה.</small>
                    </details>
                  </article>
                ))}
              </div>
              <form className="new-user-form" onSubmit={createUser}>
                <h4>יצירת משתמש חדש</h4>
                <div className="settings-grid">
                  <label>
                    שם
                    <input
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    אימייל
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                    />
                  </label>
                  <label className="wide">
                    סיסמה זמנית
                    <input
                      type="password"
                      minLength={10}
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                    />
                  </label>
                </div>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !newUser.name ||
                    !newUser.email ||
                    newUser.password.length < 10
                  }
                >
                  צור משתמש
                </button>
              </form>
            </section>
            <section
              className="admin-users admin-operations"
              id="admin-storage"
            >
              <div className="admin-section-title">
                <div>
                  <p className="eyebrow">Storage</p>
                  <h3>יעדי שמירה</h3>
                </div>
                <button
                  className="primary"
                  onClick={saveStorage}
                  disabled={busy}
                >
                  שמור ובדוק
                </button>
              </div>
              <p className="modal-help">
                מטעמי אבטחה ניתן לבחור רק אחסון פנימי או תיקיות Home Assistant
                המורשות ל־Add-on. הנתיב בתוך Share או Media הוא יחסי.
              </p>
              <div className="settings-grid">
                <label>
                  יעד גיבויים
                  <select
                    value={storageForm.backupDestination}
                    onChange={(e) =>
                      setStorageForm({
                        ...storageForm,
                        backupDestination: e.target.value,
                      })
                    }
                  >
                    <option value="internal">פנימי — /data</option>
                    <option value="share">Home Assistant Share</option>
                  </select>
                </label>
                <label>
                  תיקיית גיבויים
                  <input
                    value={storageForm.backupRelativePath}
                    disabled={storageForm.backupDestination === "internal"}
                    onChange={(e) =>
                      setStorageForm({
                        ...storageForm,
                        backupRelativePath: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  יעד גלריה
                  <select
                    value={storageForm.galleryDestination}
                    onChange={(e) =>
                      setStorageForm({
                        ...storageForm,
                        galleryDestination: e.target.value,
                      })
                    }
                  >
                    <option value="internal">פנימי — /data</option>
                    <option value="media">Home Assistant Media</option>
                    <option value="share">Home Assistant Share</option>
                  </select>
                </label>
                <label>
                  תיקיית גלריה
                  <input
                    value={storageForm.galleryRelativePath}
                    disabled={storageForm.galleryDestination === "internal"}
                    onChange={(e) =>
                      setStorageForm({
                        ...storageForm,
                        galleryRelativePath: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
              {storageStatus && (
                <div className="storage-checks">
                  <span className={storageStatus.backup?.ok ? "ok" : "fail"}>
                    ● גיבויים:{" "}
                    {storageStatus.backup?.ok
                      ? storageStatus.backup.path
                      : storageStatus.backup?.error}
                  </span>
                  <span className={storageStatus.gallery?.ok ? "ok" : "fail"}>
                    ● גלריה:{" "}
                    {storageStatus.gallery?.ok
                      ? storageStatus.gallery.path
                      : storageStatus.gallery?.error}
                  </span>
                </div>
              )}
              <div className="storage-pending">
                <span><strong>{storagePendingMedia}</strong> קובצי מדיה ממתינים לסנכרון</span>
                <button type="button" onClick={syncStorage} disabled={busy || !storagePendingMedia}>סנכרן עכשיו</button>
              </div>
            </section>
            <section className="admin-users admin-operations" id="admin-database">
              <div className="admin-section-title">
                <div><p className="eyebrow">PostgreSQL</p><h3>מסד נתונים</h3></div>
                <div className="database-actions">
                  <button onClick={() => maintainDatabase("integrity")} disabled={busy || !databaseStatus?.configured}>בדיקת שלמות</button>
                  <button className="primary" onClick={() => maintainDatabase("optimize")} disabled={busy || !databaseStatus?.configured}>בצע אופטימיזציה</button>
                </div>
              </div>
              {!databaseStatus?.configured ? <p className="modal-help">מסד PostgreSQL אינו מוגדר בסביבת הפיתוח הנוכחית.</p> : databaseStatus.status === "error" ? <p className="form-error">מסד הנתונים מוגדר אך אינו זמין כרגע: {databaseStatus.error}</p> : <>
                <div className="database-summary"><article><small>נפח כולל</small><strong>{(Number(databaseStatus.sizeBytes || 0) / 1024 / 1024).toFixed(1)} MB</strong></article><article><small>רשומות פעילות</small><strong>{Number(databaseStatus.records || 0).toLocaleString("he-IL")}</strong></article><article><small>טבלאות</small><strong>{databaseStatus.tables?.length || 0}</strong></article></div>
                <div className="database-tables">{(databaseStatus.tables || []).map((table: any) => <article key={table.name}><strong>{table.name}</strong><span>{Number(table.rows || 0).toLocaleString("he-IL")} רשומות</span><small>{(Number(table.sizeBytes || 0) / 1024).toFixed(0)} KB · {Number(table.deadRows || 0)} רשומות מתות</small></article>)}</div>
              </>}
            </section>
            <section
              className="admin-users admin-operations"
              id="admin-backups"
            >
              <div className="admin-section-title">
                <div>
                  <p className="eyebrow">הגנה והתאוששות</p>
                  <h3>גיבויים</h3>
                </div>
                <button
                  className="primary"
                  onClick={createBackup}
                  disabled={busy}
                >
                  צור גיבוי עכשיו
                </button>
              </div>
              <p className="modal-help">
                בחר מסד נתונים, הגדרות בלבד או גיבוי מלא הכולל מדיה. לפני שחזור נוצר Safety Backup אוטומטי.
              </p>
              <div className="backup-policy"><label>סוג גיבוי<select value={backupType} onChange={(e) => setBackupType(e.target.value)}><option value="database">מסד נתונים</option><option value="configuration">הגדרות</option><option value="full">מלא כולל תמונות</option></select></label><label>שעה אוטומטית<input type="number" min="0" max="23" value={storageForm.backupHour} onChange={(e) => setStorageForm({ ...storageForm, backupHour: Number(e.target.value) })} /></label><label>מספר גיבויים לשמירה<input type="number" min="2" max="60" value={storageForm.backupRetention} onChange={(e) => setStorageForm({ ...storageForm, backupRetention: Number(e.target.value) })} /></label></div>
              <div className="backup-list">
                {adminBackups.length ? (
                  adminBackups.slice(0, 8).map((backup) => (
                    <article key={backup.name}>
                      <div>
                        <strong>
                          {new Date(backup.createdAt).toLocaleString("he-IL")}
                        </strong>
                        <small>
                          {Math.max(1, Math.round(backup.size / 1024))} KB ·{" "}
                          {backup.verified ? "אומת" : "דורש בדיקה"}
                        </small>
                      </div>
                      <a
                        href={`api/admin/backups?download=${encodeURIComponent(backup.name)}`}
                        download
                      >
                        הורד
                      </a>
                      <button
                        onClick={() => restoreBackup(backup.name)}
                        disabled={busy}
                      >
                        שחזר
                      </button>
                    </article>
                  ))
                ) : (
                  <p>עדיין לא נוצרו גיבויים ידניים.</p>
                )}
              </div>
            </section>
            {adminTab === "audit" && <section className="admin-users admin-operations" id="admin-audit">
              <div className="admin-section-title">
                <div>
                  <p className="eyebrow">Security & Logs</p>
                  <h3>פעילות מערכת אחרונה</h3>
                </div>
                <span>{adminAudit.length} אירועים</span>
              </div>
              <div className="audit-list">
                {adminAudit.slice(0, 20).map((entry) => (
                  <article key={entry.id}>
                    <span
                      className={
                        entry.result === "success" ? "health-ok" : "health-warn"
                      }
                    >
                      ●
                    </span>
                    <div>
                      <strong>{entry.action}</strong>
                      <small>
                        {entry.actor} ·{" "}
                        {new Date(entry.at).toLocaleString("he-IL")}
                      </small>
                    </div>
                    <code>{entry.message || entry.target}</code>
                  </article>
                ))}
                {!adminAudit.length && (
                  <p>אין אירועים חריגים או פעולות ניהול מתועדות.</p>
                )}
              </div>
            </section>}
            {adminTab === "trash" && <section className="admin-users admin-operations admin-trash" id="admin-trash">
              <div className="admin-section-title"><div><p className="eyebrow">שחזור ומחיקה</p><h3>סל מחזור</h3><small>הפריטים נשמרים למשך 30 יום לפני מחיקה קבועה.</small></div><button type="button" className="danger" disabled={!trashItems.length} onClick={emptyTrash}>רוקן סל מחזור</button></div>
              <div className="trash-list">
                {trashItems.length ? trashItems.map((item) => <article key={item.id}><div><strong>{item.data.name || item.data.type || "פריט"}</strong><small>{item.ownerName} · {item.type === "meal" ? "ארוחה" : "פעילות"} · {new Date(item.deletedAt).toLocaleDateString("he-IL")}</small></div><div className="trash-actions"><button onClick={() => restoreTrash(item.id)}>שחזר</button><button className="danger" onClick={() => permanentlyDeleteTrash(item.id)}>מחק לצמיתות</button></div></article>) : <p>אין פריטים שנמחקו.</p>}
              </div>
            </section>}
            {adminTab === "ai" && aiStatus && <p className="settings-status">{aiStatus}</p>}
            </main>
            </div>
            <footer>
              <button onClick={() => saveAi(false)} disabled={busy}>
                שמור
              </button>
              <button
                className="primary"
                onClick={() => saveAi(true)}
                disabled={busy}
              >
                שמור ובדוק חיבור
              </button>
            </footer>
          </section>
        </div>
      )}
      {quickAddOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setQuickAddOpen(false)} />
          <section className="settings-modal quick-add-modal">
            <header>
              <div>
                <p className="eyebrow">הוספה מהירה</p>
                <h2>{quickCategory ? "מה להוסיף?" : "בחר קטגוריה"}</h2>
              </div>
              <button onClick={() => setQuickAddOpen(false)}>×</button>
            </header>
            <section className="barcode-search">
              <button type="button" onClick={() => setBarcodeScannerOpen(true)}><AppIcon name="camera" /><span><strong>סריקת ברקוד חיה</strong><small>הזיהוי מתבצע אוטומטית ולא נשמר צילום</small></span></button>
              <div className="barcode-manual-field"><input inputMode="numeric" value={barcodeValue} onChange={(event) => setBarcodeValue(event.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="או הזן מספר ברקוד" aria-label="מספר ברקוד" />{barcodeValue && <button className="barcode-clear" type="button" onClick={() => { setBarcodeValue(""); setBarcodeStatus(""); }} aria-label="ניקוי ברקוד">×</button>}<button type="button" onClick={() => lookupBarcode()}>חפש</button></div>
              {barcodeStatus && <p>{barcodeStatus}</p>}
            </section>
            <div className="quick-catalog-search"><AppIcon name="search" /><input type="search" value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="חיפוש בארוחות, פירות, ירקות ומשקאות…" aria-label="חיפוש בהוספת אוכל" />{quickSearch && <button type="button" onClick={() => setQuickSearch("")} aria-label="ניקוי החיפוש">×</button>}</div>
            {quickSearch.trim() ? (
              <div className="quick-food-grid quick-search-results">
                {Object.entries(quickFoods).flatMap(([category, items]) => items.map((item, index) => ({ ...item, category, index }))).filter((item) => `${item.name} ${item.portion} ${item.category}`.toLocaleLowerCase("he").includes(quickSearch.trim().toLocaleLowerCase("he"))).map((item: any) => <button key={`${item.category}-${item.name}-${item.portion}`} onClick={() => selectQuickFood(item)}><span className="food-sprite" style={foodSpriteStyle(item.category, item.index)} /><strong>{item.name}</strong><small>{item.portion}</small><b>{item.kcal} kcal</b></button>)}
                {(state.foods || []).filter((food) => `${food.name} ${food.category || ""}`.toLocaleLowerCase("he").includes(quickSearch.trim().toLocaleLowerCase("he"))).map((food) => <button key={food.id} onClick={() => selectQuickFood({ ...food, portion: "מנה אישית", icon: "🍽" })}>{food.image ? <img src={food.image} alt={food.name} /> : <span>🍽</span>}<strong>{food.name}</strong><small>מהמאגר האישי</small><b>{food.kcal} kcal</b></button>)}
                {onlineFoodResults.map((food) => <button key={food.id} onClick={() => selectQuickFood(food)}>{food.image ? <img src={food.image} alt="" /> : <span>▦</span>}<strong>{food.name}</strong><small>{food.brand || food.portion}</small><small>{food.source} · {food.confidence?.label || "יש לבדוק מול התווית"}</small><b>{food.kcal} kcal / 100g</b></button>)}
                <p className="online-food-status">{onlineFoodStatus}</p>
              </div>
            ) : !quickCategory ? (
              <div className="category-grid">
                <button className="capture-meal-entry add-source-entry" onClick={openInAppCamera}>
                  <span className="manual-meal-art"><AppIcon name="camera" /></span>
                  <strong>צלם ארוחה</strong>
                  <small>צילום חדש, גלריה או קובץ</small>
                </button>
                <button className="add-source-entry" onClick={() => openManualMeal()}>
                  <span className="manual-meal-art"><AppIcon name="edit" /></span>
                  <strong>ארוחה ידנית</strong>
                  <small>AI יחשב לפי התיאור שלך</small>
                </button>
                <button className="forgotten-meal-entry add-source-entry" onClick={openForgottenMeals}>
                  <span className="manual-meal-art"><AppIcon name="history" /></span>
                  <strong>שכחתי לעדכן</strong>
                  <small>הוסף כמה ארוחות להיום או לימים קודמים</small>
                </button>
                <button className="add-source-entry" onClick={() => setVoiceOpen(true)}>
                  <span className="manual-meal-art"><AppIcon name="mic" /></span>
                  <strong>הקלט ארוחה</strong>
                  <small>AI יתמלל ויציג לאישור</small>
                </button>
                <button onClick={() => setQuickCategory("vegetables")}>
                  <img src="category-vegetables-v1.png" alt="מבחר ירקות" />
                  <strong>ירקות</strong>
                  <small>טריים, מבושלים וסלט</small>
                </button>
                <button onClick={() => setQuickCategory("fruits")}>
                  <img src="category-fruits-v1.png" alt="מבחר פירות" />
                  <strong>פירות</strong>
                  <small>מנה נפוצה בלחיצה</small>
                </button>
                <button onClick={() => setQuickCategory("drinks")}>
                  <img src="category-drinks-v1.png" alt="מבחר משקאות" />
                  <strong>משקאות</strong>
                  <small>חמים, קלים, יין ובירה</small>
                </button>
              </div>
            ) : (
              <>
                <button
                  className="category-back"
                  onClick={() => { setQuickCategory(""); setQuickSearch(""); }}
                >
                  → חזרה לקטגוריות
                </button>
                <div className={`quick-food-grid ${quickCategory}`}>
                  {quickFoods[quickCategory].filter((item) => !quickSearch.trim() || `${item.name} ${item.portion}`.toLocaleLowerCase("he").includes(quickSearch.trim().toLocaleLowerCase("he"))).map((item, index) => (
                    <button
                      key={`${item.name}-${item.portion}`}
                      onClick={() => selectQuickFood(item)}
                    >
                      <span
                        className="food-sprite"
                        style={foodSpriteStyle(quickCategory, index)}
                      />
                      <strong>{item.name}</strong>
                      <small>{item.portion}</small>
                      <b>{item.kcal} kcal</b>
                    </button>
                  ))}
                  {(state.foods || [])
                    .filter((food) => food.category === quickCategory && (!quickSearch.trim() || `${food.name} ${food.category || ""}`.toLocaleLowerCase("he").includes(quickSearch.trim().toLocaleLowerCase("he"))))
                    .map((food) => (
                      <button
                        key={food.id}
                        onClick={() =>
                          selectQuickFood({
                            ...food,
                            portion: "מנה אישית",
                            icon: "🍽",
                          })
                        }
                      >
                        {food.image ? (
                          <img src={food.image} alt={food.name} />
                        ) : (
                          <span>🍽</span>
                        )}
                        <strong>{food.name}</strong>
                        <small>מהמאגר האישי</small>
                        <b>{food.kcal} kcal</b>
                      </button>
                    ))}
                  <button
                    className="add-food-tile"
                    onClick={() => {
                      setSaveToLibrary(true);
                      setGenerateFoodArtwork(true);
                      openManualMeal(quickCategory);
                    }}
                  >
                    <span>＋</span>
                    <strong>הוסף פריט אחר</strong>
                    <small>הגדר סוג, ערכים ותמונה</small>
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {forgottenOpen && (
        <div className="modal-layer forgotten-layer">
          <button className="backdrop" onClick={() => !busy && setForgottenOpen(false)} />
          <section className="settings-modal forgotten-modal">
            <header><div><h2>שכחתי לעדכן</h2><small>אפשר להוסיף כמה ארוחות ולשמור אותן יחד ביום ובשעה הנכונים</small></div><button type="button" disabled={busy} onClick={() => setForgottenOpen(false)}>×</button></header>
            <div className="forgotten-meal-list">
              {forgottenMeals.map((meal, mealIndex) => {
                const totals = calculateMealDraft(meal.items, {});
                return <article className={meal.calculated ? "calculated" : ""} key={meal.id}>
                  <header><strong>ארוחה {mealIndex + 1}</strong>{forgottenMeals.length > 1 && <button type="button" onClick={() => setForgottenMeals((meals) => meals.filter((item) => item.id !== meal.id))}>הסר</button>}</header>
                  <label className="wide">פירוט הארוחה<textarea value={meal.description} onChange={(event) => updateForgottenMeal(meal.id, { description: event.target.value, items: [], name: "", calculated: false })} placeholder="למשל: קפה עם מעט חלב, כריך גבינה וסלט" /></label>
                  <div className="forgotten-when"><label>מתי<select value={meal.dayOffset} onChange={(event) => updateForgottenMeal(meal.id, { dayOffset: Number(event.target.value), calculated: meal.calculated })}><option value={0}>היום</option><option value={1}>אתמול</option><option value={2}>שלשום</option></select></label><label>שעה<input type="time" value={meal.time} onChange={(event) => updateForgottenMeal(meal.id, { time: event.target.value, calculated: meal.calculated })} /></label><label>סוג ארוחה<select value={meal.period} onChange={(event) => updateForgottenMeal(meal.id, { period: event.target.value, calculated: meal.calculated })}>{Object.entries(periodLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
                  {meal.calculated && <section className="forgotten-review"><div><strong>{meal.name}</strong><b>{Math.round(totals.kcal)} kcal</b></div>{meal.items.map((item: any, itemIndex: number) => <div className="forgotten-item" key={`${meal.id}-${itemIndex}`}><label>מרכיב<input value={item.name || ""} onChange={(event) => updateForgottenMeal(meal.id, { items: meal.items.map((current: any, index: number) => index === itemIndex ? { ...current, name: event.target.value } : current) })} /></label><label>כמות<div className="forgotten-stepper"><button type="button" onClick={() => updateForgottenMeal(meal.id, { items: meal.items.map((current: any, index: number) => index === itemIndex ? { ...current, quantity: Math.max(.25, Number(current.quantity || 1) - 1) } : current) })}>−</button><input type="number" min=".25" step=".25" value={item.quantity || 1} onChange={(event) => updateForgottenMeal(meal.id, { items: meal.items.map((current: any, index: number) => index === itemIndex ? { ...current, quantity: Number(event.target.value) } : current) })} /><button type="button" onClick={() => updateForgottenMeal(meal.id, { items: meal.items.map((current: any, index: number) => index === itemIndex ? { ...current, quantity: Number(current.quantity || 1) + 1 } : current) })}>＋</button></div></label><label>גרם<input type="number" min="1" value={item.grams || 0} onChange={(event) => updateForgottenMeal(meal.id, { items: meal.items.map((current: any, index: number) => index === itemIndex ? { ...current, grams: Number(event.target.value) } : current) })} /></label></div>)}</section>}
                </article>;
              })}
            </div>
            <button className="forgotten-add" type="button" onClick={() => setForgottenMeals((meals) => [...meals, newForgottenMeal()])}>＋ הוסף ארוחה נוספת</button>
            {forgottenStatus && <p className="forgotten-status" role="status">{forgottenStatus}</p>}
            <footer><button type="button" disabled={busy} onClick={calculateForgottenMeals}>{busy ? "מחשב…" : "חשב קלוריות עם AI"}</button><button className="primary" type="button" disabled={busy || forgottenMeals.some((meal) => !meal.calculated)} onClick={saveForgottenMeals}>אישור והוספת הכל ליומן</button></footer>
          </section>
        </div>
      )}
      {voiceOpen && (
        <div className="modal-layer">
          <button
            className="backdrop"
            onClick={() => !recording && !busy && setVoiceOpen(false)}
          />
          <section className="settings-modal voice-modal">
            <header>
              <div>
                <p className="eyebrow">הוספה ידנית בקול</p>
                <h2>ספר לי מה אכלת</h2>
              </div>
              <button
                disabled={recording || busy}
                onClick={() => setVoiceOpen(false)}
              >
                ×
              </button>
            </header>
            <button
              className={recording ? "voice-record recording" : "voice-record"}
              onClick={recording ? stopVoiceRecording : startVoiceRecording}
              disabled={busy}
            >
              <span>{busy ? "◌" : recording ? "■" : "🎙️"}</span>
              <strong>
                {busy
                  ? `מעבד… ${voiceProcessingSeconds} שנ׳`
                  : recording
                    ? `עצור ושלח · ${voiceSeconds}/60`
                    : "התחל הקלטה"}
              </strong>
            </button>
            <p className="voice-status" aria-live="polite">
              {voiceProcessingSeconds > 15 && busy
                ? "מנתח פריטים, כמויות וערכים תזונתיים…"
                : voiceStatus}
            </p>
            <small className="voice-privacy">
              קובץ הקול משמש לתמלול בלבד ואינו נשמר. לפני הוספה תוכל לערוך כל
              פריט וכמות.
            </small>
          </section>
        </div>
      )}
      {tasteWizardOpen && (
        <div className="modal-layer"><button className="backdrop" onClick={() => setTasteWizardOpen(false)} /><section className="settings-modal taste-wizard">
          <header><div><h2>הטעם האישי שלי</h2></div><button onClick={() => setTasteWizardOpen(false)}>×</button></header>
          <div className="taste-wizard-progress"><i style={{ width: `${((tasteWizardStep + 1) / (tasteQuestions.length + 1)) * 100}%` }} /><span>{tasteWizardStep + 1}/{tasteQuestions.length + 1}</span></div>
          {tasteWizardStep < tasteQuestions.length ? <section><h3>{tasteQuestions[tasteWizardStep].title}</h3><p>לכל פריט אפשר לבחור אוהב, ניטרלי או לא אוהב.</p><div className="taste-options">{tasteQuestions[tasteWizardStep].options.map((option) => { const choice = tasteDraft.likes?.includes(option) ? "like" : tasteDraft.dislikes?.includes(option) ? "dislike" : "neutral"; return <article key={option}><strong>{option}</strong><div><button type="button" className={choice === "dislike" ? "selected dislike" : ""} onClick={() => setTasteChoice(option, "dislike")}>לא אוהב</button><button type="button" className={choice === "neutral" ? "selected" : ""} onClick={() => setTasteChoice(option, "neutral")}>ניטרלי</button><button type="button" className={choice === "like" ? "selected like" : ""} onClick={() => setTasteChoice(option, "like")}>אוהב</button></div></article>; })}</div></section> : <section className="taste-finish"><h3>עוד פרט קטן</h3><label>כמה זמן מתאים לך להשקיע בדרך כלל?<select value={tasteDraft.prepTime || "medium"} onChange={(event) => setTasteDraft({ ...tasteDraft, prepTime: event.target.value })}><option value="quick">עד 10 דקות</option><option value="medium">עד חצי שעה</option><option value="long">אין מגבלה</option></select></label><div><span><b>{tasteDraft.likes?.length || 0}</b> אהובים</span><span><b>{tasteDraft.dislikes?.length || 0}</b> לא אהובים</span></div><p>המידע יישמר בפרופיל וישמש את המלצות הארוחות ואת המאמן. אפשר לשנות אותו בכל עת.</p></section>}
          <footer><button type="button" onClick={() => tasteWizardStep ? setTasteWizardStep(tasteWizardStep - 1) : setTasteWizardOpen(false)}>{tasteWizardStep ? "חזרה" : "ביטול"}</button><button className="primary" type="button" disabled={busy} onClick={() => tasteWizardStep < tasteQuestions.length ? setTasteWizardStep(tasteWizardStep + 1) : saveTasteWizard()}>{tasteWizardStep < tasteQuestions.length ? "המשך" : busy ? "שומר…" : "שמור העדפות"}</button></footer>
        </section></div>
      )}
      {profileOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setProfileOpen(false)} />
          <form className="settings-modal profile-modal" onSubmit={saveProfile}>
            <header>
              <div>
                <p className="eyebrow">החשבון שלי</p>
                <h2>פרטים אישיים</h2>
              </div>
              <button type="button" onClick={() => setProfileOpen(false)}>
                ×
              </button>
            </header>
            <div className="profile-photo">
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
              >
                {profileForm.avatar ? (
                  <img src={profileForm.avatar} alt="תמונת פרופיל" />
                ) : (
                  <span>{state.owner.name[0]}</span>
                )}
                <small>החלף תמונה</small>
              </button>
              <input
                ref={avatarInput}
                className="camera-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={loadAvatar}
              />
              <div>
                <strong>{state.owner.name}</strong>
                <small>{state.owner.email}</small>
                <button type="button" onClick={switchUser}>
                  החלף משתמש / יציאה
                </button>
              </div>
            </div>
            <nav className="profile-tabs" aria-label="חלקי הפרופיל">{[["basic","user","אישי"],["health","heart","בריאות"],["goals","target","יעדים"],["notifications","bell","התראות"],["account","settings","חשבון"]].map(([key,icon,label]) => <button key={key} type="button" className={profileTab === key ? "active" : ""} onClick={() => setProfileTab(key as typeof profileTab)}><span><AppIcon name={icon as any} /></span><b>{label}</b></button>)}</nav>
            {profileTab === "basic" && <section className="profile-tab-panel"><header><span><AppIcon name="user" /></span><div><strong>הפרטים הבסיסיים שלי</strong><small>נתונים המשמשים לחישוב יעדים ומעקב</small></div></header>
            <div className="settings-grid">
              <label>
                שם
                <input
                  value={profileForm.name || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                תאריך לידה
                <input type="date" value={profileForm.birthDate || ""} onChange={(e) => setProfileForm({ ...profileForm, birthDate: e.target.value })} />
                <small>{exactAge(profileForm.birthDate) !== null ? `גיל מחושב: ${exactAge(profileForm.birthDate)} שנים` : "הגיל יחושב אוטומטית וישמש לחישוב היעדים."}</small>
              </label>
              <label>
                גובה (ס״מ)
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={profileForm.height || ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      height: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="initial-weight-field">
                <span>משקל התחלתי <b>נקודת ייחוס קבועה</b></span>
                <input
                  type="number"
                  min="25"
                  max="350"
                  step="0.1"
                  value={profileForm.initialWeight || ""}
                  placeholder="הזן משקל התחלתי"
                  onChange={(e) => setProfileForm({ ...profileForm, initialWeight: Number(e.target.value) })}
                />
                <small>ניתן לתקן ידנית. מדידות משקל נוכחי לא ישנו את נקודת הייחוס.</small>
              </label>
              {initialWeight > 0 && Number(profileForm.initialWeight) !== initialWeight && <label className="initial-weight-password">סיסמה לאישור שינוי<input type="password" autoComplete="current-password" value={profileForm.initialWeightPassword || ""} onChange={(e) => setProfileForm({ ...profileForm, initialWeightPassword: e.target.value })} placeholder="הסיסמה הנוכחית" /><small>השינוי יישמר רק לאחר אימות הסיסמה.</small></label>}
              <label className="current-weight-field">
                <span>משקל נוכחי <b>נשמר בהיסטוריה</b></span>
                <input
                  type="number"
                  min="25"
                  max="350"
                  step="0.1"
                  value={weightValue || ""}
                  onChange={(e) => setWeightValue(Number(e.target.value))}
                />
                <small>{weightEntries.at(-1)?.date ? `המדידה האחרונה: ${new Date(`${weightEntries.at(-1).date}T12:00:00`).toLocaleDateString("he-IL")}` : "עדיין לא נשמרה מדידת משקל"}</small>
              </label>
              <label>
                משקל יעד
                <input
                  type="number"
                  min="25"
                  max="350"
                  step="0.1"
                  value={profileForm.targetWeight || ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      targetWeight: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                רמת פעילות
                <select
                  value={profileForm.activity || "light"}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, activity: e.target.value })
                  }
                >
                  <option value="low">רוב היום בישיבה</option>
                  <option value="light">קצת בתנועה</option>
                  <option value="active">פעיל</option>
                  <option value="very">פעיל מאוד</option>
                </select>
              </label>
              <fieldset className="wide profile-choice-field"><legend>סוגי אימון מועדפים</legend><div className="profile-choice-chips">{Object.entries(workoutTypeLabels).map(([key,label]) => <button type="button" key={key} className={(profileForm.workoutTypes || []).includes(key) ? "selected" : ""} onClick={() => setProfileForm({ ...profileForm, workoutTypes: (profileForm.workoutTypes || []).includes(key) ? profileForm.workoutTypes.filter((item: string) => item !== key) : [...(profileForm.workoutTypes || []), key] })}>{label}</button>)}</div></fieldset>
              <label className="wide">סגנון תזונה<select value={profileForm.diet || "none"} onChange={(e) => setProfileForm({ ...profileForm, diet: e.target.value })}>{dietStyles.map(([key,title,description]) => <option key={key} value={key}>{title} — {description}</option>)}</select></label>
              <label className="wide">
                מגבלות והעדפות
                <input
                  value={profileForm.restrictions || ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      restrictions: e.target.value,
                    })
                  }
                  placeholder="רגישויות, אלרגיות או מזונות שנמנעים מהם"
                />
              </label>
            </div>
            </section>}
            {profileTab === "health" && <section className="profile-tab-panel"><header><span><AppIcon name="heart" /></span><div><strong>בריאות והתאמה אישית</strong><small>מידע רלוונטי להמלצות בטוחות יותר</small></div></header>
            <section className="health-profile">
              <div><p className="eyebrow">מידע בריאותי רלוונטי</p><h3>התאמה בטוחה יותר של ההמלצות</h3><small>נשמר בפרופיל הפרטי ומשמש את ה־AI. אינו תחליף לייעוץ רפואי.</small></div>
              <div className="settings-grid">
                <label>מצב סוכר<select value={profileForm.diabetesStatus || "none"} onChange={(e) => setProfileForm({ ...profileForm, diabetesStatus: e.target.value })}><option value="none">ללא סוכרת ידועה</option><option value="borderline">גבולי / נטייה</option><option value="prediabetes">טרום־סוכרת</option><option value="diabetes">סוכרת</option></select></label>
                <label>הריון והנקה<select value={profileForm.pregnancyStatus || "none"} onChange={(e) => setProfileForm({ ...profileForm, pregnancyStatus: e.target.value })}><option value="none">לא רלוונטי</option><option value="pregnant">הריון</option><option value="breastfeeding">הנקה</option></select></label>
                <label className="checkbox-label"><input type="checkbox" checked={Boolean(profileForm.hypertension)} onChange={(e) => setProfileForm({ ...profileForm, hypertension: e.target.checked })} /> לחץ דם גבוה</label>
                <label className="wide">אלרגיות למזון<input value={profileForm.foodAllergies || ""} onChange={(e) => setProfileForm({ ...profileForm, foodAllergies: e.target.value })} placeholder="למשל: בוטנים, חלב" /></label>
                <label className="wide">תרופות רלוונטיות לתזונה<input value={profileForm.relevantMedications || ""} onChange={(e) => setProfileForm({ ...profileForm, relevantMedications: e.target.value })} placeholder="רק מידע שחשוב להמלצות מזון ותיאבון" /></label>
              </div>
            </section>
            </section>}
            {profileTab === "goals" && <section className="profile-tab-panel"><header><span><AppIcon name="target" /></span><div><strong>יעדים ומדדים</strong><small>טווחים, משקל ומצב ההתקדמות</small></div></header>
            <section className="health-profile">
              <div><p className="eyebrow">יעדים מקצועיים</p><h3>טווחים ויום אימון</h3></div>
              <div className="settings-grid">
                <label>אופן חישוב<select value={profileForm.targetMode || "automatic"} onChange={(e) => setProfileForm({ ...profileForm, targetMode: e.target.value })}><option value="automatic">אוטומטי ובטוח</option><option value="custom">מותאם אישית</option></select></label>
                <label>תוספת קלוריות ביום אימון<input type="number" min="0" max="600" step="25" value={profileForm.trainingDayBonus || 0} onChange={(e) => setProfileForm({ ...profileForm, trainingDayBonus: Number(e.target.value) })} /></label>
                <label className="wide">מתי מתחיל יום חדש?<select value={profileForm.dayBoundaryMode || "midnight"} onChange={(e) => setProfileForm({ ...profileForm, dayBoundaryMode: e.target.value })}><option value="midnight">אוטומטית בחצות</option><option value="manual">רק כשאני לוחץ „סיים יום”</option></select><small>{profileForm.dayBoundaryMode === "manual" ? "מתאים למשמרות: ארוחות, מים ופעילות אחרי חצות יישארו ביום הפעיל עד שתסיים אותו." : "המדדים מתאפסים בכל יום בשעה 00:00 לפי אזור הזמן שלך."}</small></label>
                {profileForm.targetMode === "custom" && <>
                  <label>קלוריות<input type="number" value={profileForm.customCalories || ""} onChange={(e) => setProfileForm({ ...profileForm, customCalories: Number(e.target.value) })} /></label>
                  <label>חלבון<input type="number" value={profileForm.customProtein || ""} onChange={(e) => setProfileForm({ ...profileForm, customProtein: Number(e.target.value) })} /></label>
                  <label>פחמימות<input type="number" value={profileForm.customCarbs || ""} onChange={(e) => setProfileForm({ ...profileForm, customCarbs: Number(e.target.value) })} /></label>
                  <label>שומן<input type="number" value={profileForm.customFat || ""} onChange={(e) => setProfileForm({ ...profileForm, customFat: Number(e.target.value) })} /></label>
                </>}
                <details className="wide calorie-plan-explainer"><summary>איך חושב יעד הקלוריות?</summary><p>היעד מבוסס על חילוף החומרים הבסיסי, רמת הפעילות והמטרה שבחרת. במצב אוטומטי נשמר גם סף בטיחות; במצב מותאם הערך שהזנת הוא הקובע.</p>{profile.caloriePlan && <ul><li>BMR: {profile.caloriePlan.bmr} קלוריות</li><li>תחזוקה משוערת: {profile.caloriePlan.maintenance} קלוריות</li><li>יעד נוכחי: {profile.calories} קלוריות</li></ul>}</details>
              </div>
            </section>
            <div className="profile-metrics">
              <span className="initial-weight-metric">
                משקל רישום <b>{Number(profile.initialWeight || initialWeight || 0) > 0 ? `${Number(profile.initialWeight || initialWeight).toFixed(1)} ק״ג` : "לא נשמר"}</b><small>נקודת ייחוס קבועה</small>
              </span>
              <span>
                BMI <b>{profile.caloriePlan?.bmi}</b>
              </span>
              <span className="current-weight-metric">
                משקל נוכחי <b>{latestWeight} ק״ג</b><small>{weightEntries.at(-1)?.date ? new Date(`${weightEntries.at(-1).date}T12:00:00`).toLocaleDateString("he-IL") : "ללא תאריך"}</small>
              </span>
              <span>
                יעד <b>{profile.targetWeight} ק״ג</b>
              </span>
              <span>
                מגמה{" "}
                <b>
                  {weightEntries.length > 1
                    ? `${weightChange > 0 ? "+" : ""}${weightChange} ק״ג`
                    : "אין עדיין"}
                </b>
              </span>
            </div>
            </section>}
            {profileTab === "notifications" && <section className="profile-tab-panel notification-settings-panel"><header><span><AppIcon name="bell" /></span><div><strong>התראות חכמות</strong><small>רק מה שבחרת, בזמן רלוונטי ובהתאם ליום שלך</small></div></header>
              <label className="notification-master" htmlFor="notification-master-enabled"><input id="notification-master-enabled" aria-label="הפעלת התראות אוטומטיות" type="checkbox" checked={profileForm.notificationPreferences?.enabled !== false} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, enabled: event.target.checked } })} /><span><strong>הפעלת התראות אוטומטיות</strong><small>המתזמן מכבד שעות שקטות ומגבלת התראות יומית</small></span></label>
              <div className="notification-type-list">{notificationTypeOptions.map(([key,title,description]) => <article key={key}><label htmlFor={`notification-${key}`}><input id={`notification-${key}`} aria-label={title} type="checkbox" checked={Boolean(profileForm.notificationPreferences?.[key])} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, [key]: event.target.checked } })} /><span><strong>{title}</strong><small>{description}</small></span></label><button type="button" disabled={Boolean(testingNotificationType)} onClick={() => testNotification(key, title)}>{testingNotificationType === key ? "שולח…" : "שלח לבדיקה"}</button></article>)}</div>
              <section className="notification-times"><header><strong>זמנים מועדפים</strong><small>הודעה תישלח רק אם היא עדיין רלוונטית</small></header><div>
                <label>ארוחת בוקר<input type="time" value={profileForm.notificationPreferences?.breakfastTime || "09:00"} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, breakfastTime: event.target.value } })} /></label>
                <label>ארוחת צהריים<input type="time" value={profileForm.notificationPreferences?.lunchTime || "14:00"} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, lunchTime: event.target.value } })} /></label>
                <label>ארוחת ערב<input type="time" value={profileForm.notificationPreferences?.dinnerTime || "20:00"} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, dinnerTime: event.target.value } })} /></label>
                <label>תזכורת מים<input type="time" value={profileForm.notificationPreferences?.waterTime || "16:30"} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, waterTime: event.target.value } })} /></label>
                <label>המלצת מאמן<input type="time" value={profileForm.notificationPreferences?.coachTime || "11:30"} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, coachTime: event.target.value } })} /></label>
                <label>סיכום יום<input type="time" value={profileForm.notificationPreferences?.summaryTime || "21:15"} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, summaryTime: event.target.value } })} /></label>
              </div></section>
              <section className="quiet-hours"><header><strong>שעות שקטות</strong><small>בשעות האלה לא תישלח אף התראה</small></header><div><label>התחלה<input type="time" value={profileForm.notificationPreferences?.quietStart || "22:30"} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, quietStart: event.target.value } })} /></label><label>סיום<input type="time" value={profileForm.notificationPreferences?.quietEnd || "07:00"} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, quietEnd: event.target.value } })} /></label><label>מקסימום ביום<select value={profileForm.notificationPreferences?.maxPerDay || 5} onChange={(event) => setProfileForm({ ...profileForm, notificationPreferences: { ...notificationPreferenceDefaults, ...profileForm.notificationPreferences, maxPerDay: Number(event.target.value) } })}><option value={5}>5 התראות</option><option value={10}>10 התראות</option><option value={15}>15 התראות</option><option value={20}>20 התראות</option></select></label></div></section>
              <button className="notification-enable-button" type="button" onClick={enableNotifications} disabled={busy}>{busy ? "מפעיל…" : notificationPermission === "granted" ? "בדוק שוב התראות למסך הנעילה" : "הפעל התראות למסך הנעילה"}</button>
              <p className={`notification-live-status ${notificationStatus.includes("✓") ? "success" : ""}`} aria-live="polite">{notificationStatus || (notificationPermission === "granted" ? "הרשאת iPhone קיימת. לחץ כדי לוודא שהחיבור לשרת תקין." : "לאחר הלחיצה iPhone יבקש ממך לאשר התראות.")}</p>
            </section>}
            {profileTab === "account" && <section className="profile-tab-panel account-panel"><header><span><AppIcon name="settings" /></span><div><strong>העדפות וחשבון</strong><small>תצוגה, שיתוף, גיבוי וניהול מידע</small></div></header>
            <section className="account-credentials">
              <strong>פרטי התחברות</strong>
              <div className="coach-voice-profile"><strong>זהות וקול הליווי</strong><p>השם, לשון הפנייה והקול נשמרים בנפרד כדי שהשיחה תהיה עקבית ונעימה.</p><div><label>שם<select value={String(profileForm.coachName || "Cal").toLowerCase() === "ezi" ? "Eazi" : "Cal"} onChange={(e) => setProfileForm({ ...profileForm, coachName: e.target.value })}><option value="Cal">Cal</option><option value="Eazi">Eazi</option></select></label><label>זהות<select value={profileForm.coachGender || "male"} onChange={(e) => setProfileForm({ ...profileForm, coachGender: e.target.value })}><option value="male">מאמן</option><option value="female">מאמנת</option></select></label><label>איך לפנות אליי<select value={profileForm.userAddressGender || "male"} onChange={(e) => setProfileForm({ ...profileForm, userAddressGender: e.target.value })}><option value="male">זכר</option><option value="female">נקבה</option></select></label><label>ספק קול<select value={profileForm.coachVoiceProvider || "cloud"} onChange={(e) => setProfileForm({ ...profileForm, coachVoiceProvider: e.target.value })}><option value="cloud">{(state.ai?.voiceProvider || state.ai?.roles?.coach?.provider || state.ai?.provider) === "gemini" ? "Gemini — קול ענן עברי" : "OpenAI — קול ענן עברי"}</option><option value="device">קול המכשיר</option></select></label><label>קול<select value={`${profileForm.coachVoice || "male"}-${profileForm.coachVoiceStyle || "warm"}`} onChange={(e) => { const [voice, style] = e.target.value.split("-"); setProfileForm({ ...profileForm, coachVoice: voice, coachVoiceStyle: style }); }}><option value="male-warm">גברי — חם ורגוע</option><option value="male-clear">גברי — ברור וישיר</option><option value="female-warm">נשי — חם ורגוע</option><option value="female-clear">נשי — ברור ובהיר</option></select></label></div></div>
              <label>שפת הממשק<select value={profileForm.language || "he"} onChange={(e) => setProfileForm({ ...profileForm, language: e.target.value })}><option value="he">עברית</option><option value="en">English (beta)</option></select><small>הבחירה נשמרת למשתמש ומשנה גם את כיוון הממשק. תרגום אנגלי מלא יושלם בהדרגה.</small></label>
              <label>כתובת אימייל<input type="email" value={profileForm.email || ""} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} /></label>
              {profileForm.email !== state.owner.email && <label>סיסמה נוכחית לאישור שינוי<input type="password" autoComplete="current-password" value={profileForm.accountPassword || ""} onChange={(e) => setProfileForm({ ...profileForm, accountPassword: e.target.value })} /></label>}
              <div className="password-change-grid"><label>סיסמה נוכחית<input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} /></label><label>סיסמה חדשה<input type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} /></label><label>אימות סיסמה חדשה<input type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} /></label><button type="button" disabled={busy || !passwordForm.currentPassword || passwordForm.newPassword.length < 10 || passwordForm.newPassword !== passwordForm.confirmPassword} onClick={(event) => void changeAdminPassword(event as any)}>שנה סיסמה</button></div>
            </section>
            <section className="camera-calibration-settings"><strong>כיול הערכת גודל בצילום</strong><p>הכיול מסייע לאומדן המנות בלבד ואינו מחליף שקילה.</p><div className="settings-grid"><label>אובייקט ייחוס<select value={profileForm.cameraCalibration?.reference || "none"} onChange={(e) => setProfileForm({ ...profileForm, cameraCalibration: { ...profileForm.cameraCalibration, reference: e.target.value } })}><option value="none">ללא אובייקט ייחוס</option><option value="plate">צלחת קבועה</option><option value="card">כרטיס בגודל תקני</option></select></label>{profileForm.cameraCalibration?.reference === "plate" && <label>קוטר הצלחת בס״מ<input type="number" min="15" max="40" step=".5" value={profileForm.cameraCalibration?.plateDiameterCm || 26} onChange={(e) => setProfileForm({ ...profileForm, cameraCalibration: { ...profileForm.cameraCalibration, plateDiameterCm: Number(e.target.value) } })} /></label>}<label className="checkbox-label"><input type="checkbox" checked={profileForm.cameraCalibration?.useLearnedCorrections !== false} onChange={(e) => setProfileForm({ ...profileForm, cameraCalibration: { ...profileForm.cameraCalibration, useLearnedCorrections: e.target.checked } })} /> למד מהתיקונים שלי</label></div></section>
            <button className="taste-profile-entry" type="button" onClick={openTasteWizard}><span>♡</span><div><strong>שאלון טעמים והעדפות</strong><small>{profile?.tasteProfile?.completedAt ? `${profile.tasteProfile.likes?.length || 0} העדפות אהובות נשמרו · אפשר לעדכן` : "שאלון קצר ולא חובה להתאמת המלצות הארוחות וה־AI"}</small></div><b>←</b></button>
            <button className="profile-sharing acquaintance-entry" type="button" onClick={() => setAcquaintanceOpen(true)}><span>✦</span><div><strong>נעים להכיר</strong><small>{profile?.acquaintance?.completedAt ? "השאלון נשמר · אפשר לעדכן בכל זמן" : "טופס אישי אופציונלי להתאמה מדויקת יותר"}</small></div><b>‹</b></button>
            {acquaintanceOpen && <div className="modal-layer acquaintance-layer"><button className="backdrop" type="button" onClick={() => setAcquaintanceOpen(false)} /><section className="settings-modal acquaintance-modal">
              <header><div><h2>נעים להכיר</h2><small>כל השדות לא חובה — בחר מה נוח לך לשתף</small></div><button type="button" onClick={() => setAcquaintanceOpen(false)}>×</button></header>
              <div className="acquaintance-intro">המידע עוזר להתאים את התזמון, סוג הארוחות וסגנון הליווי. אפשר לדלג על כל שדה.</div>
              <div className="settings-grid">
                <label>סוג דם (אם ידוע)<select value={profileForm.acquaintance?.bloodType || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, bloodType: e.target.value } })}><option value="">לא ידוע / מעדיף לא לציין</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>סדר היום<select value={profileForm.acquaintance?.dailySchedule || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, dailySchedule: e.target.value } })}><option value="">לא בחרתי</option><option value="regular">שעות קבועות יחסית</option><option value="shifts">עבודה במשמרות</option><option value="irregular">משתנה מיום ליום</option><option value="night">פעילות בעיקר בלילה</option></select></label>
                <label>דפוס ארוחות<select value={profileForm.acquaintance?.mealPattern || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, mealPattern: e.target.value } })}><option value="">לא בחרתי</option><option value="three">שלוש ארוחות</option><option value="small">ארוחות קטנות ותכופות</option><option value="skip">נוטה לדלג על ארוחות</option><option value="late">רוב האכילה בערב</option><option value="variable">משתנה</option></select></label>
                <label>אפשרות לבשל<select value={profileForm.acquaintance?.cookingAccess || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, cookingAccess: e.target.value } })}><option value="">לא בחרתי</option><option value="daily">מבשל/ת ברוב הימים</option><option value="sometimes">לפעמים</option><option value="rare">כמעט שלא</option><option value="prepared">מעדיף/ה אוכל מוכן</option></select></label>
                <label>תקציב מזון<select value={profileForm.acquaintance?.foodBudget || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, foodBudget: e.target.value } })}><option value="">לא בחרתי</option><option value="low">חסכוני</option><option value="medium">בינוני</option><option value="flexible">גמיש</option></select></label>
                <label>שעות שינה ממוצעות<input type="number" min="0" max="16" step=".5" value={profileForm.acquaintance?.sleepHours || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, sleepHours: Number(e.target.value) } })} /></label>
                <label>רמת מתח 0–10<input type="number" min="0" max="10" value={profileForm.acquaintance?.stressLevel || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, stressLevel: Number(e.target.value) } })} /></label>
                <label>אכילה רגשית<select value={profileForm.acquaintance?.emotionalEating || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, emotionalEating: e.target.value } })}><option value="">לא בחרתי</option><option value="rare">כמעט שלא</option><option value="sometimes">לפעמים</option><option value="often">לעיתים קרובות</option><option value="unsure">לא בטוח/ה</option></select></label>
                <label>סגנון ליווי מועדף<select value={profileForm.acquaintance?.coachingStyle || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, coachingStyle: e.target.value } })}><option value="">לא בחרתי</option><option value="practical">קצר ומעשי</option><option value="supportive">מעודד ותומך</option><option value="detailed">מפורט ומבוסס הסבר</option><option value="direct">ישיר וממוקד</option></select></label>
                <label className="wide">מתי הרעב או החשק הכי חזקים?<input value={profileForm.acquaintance?.hungerTimes || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, hungerTimes: e.target.value } })} placeholder="למשל: אחר הצהריים או אחרי ארוחת ערב" /></label>
                <label className="wide">רגישויות עיכול חשובות<input value={profileForm.acquaintance?.digestiveIssues || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, digestiveIssues: e.target.value } })} placeholder="למשל: צרבת, נפיחות או רגישות ללקטוז" /></label>
                <label className="wide">עיסוק ושגרת יום<input value={profileForm.acquaintance?.occupation || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, occupation: e.target.value } })} placeholder="למשל: עבודה משרדית, נהיגה או עבודה פיזית" /></label>
                <label className="wide">מה חשוב לך להשיג?<textarea value={profileForm.acquaintance?.motivation || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, motivation: e.target.value } })} /></label>
                <label className="wide">מה בדרך כלל מקשה עליך?<textarea value={profileForm.acquaintance?.eatingChallenges || ""} onChange={(e) => setProfileForm({ ...profileForm, acquaintance: { ...profileForm.acquaintance, eatingChallenges: e.target.value } })} /></label>
              </div>
              <footer><button type="button" onClick={() => setAcquaintanceOpen(false)}>ביטול</button><button className="primary" type="button" disabled={busy} onClick={saveAcquaintance}>{busy ? "שומר…" : "שמור את מה שבחרתי"}</button></footer>
            </section></div>}
            <button
              className="profile-sharing"
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setPartnerOpen(true);
              }}
            >
              <span>♡</span>
              <div>
                <strong>שיתוף ומעקב משותף</strong>
                <small>הזמנת בן או בת זוג וניהול הרשאות השיתוף</small>
              </div>
              <b>‹</b>
            </button>
            <button className="profile-sharing new-cycle-entry" type="button" onClick={() => { setNewCycleForm({ currentWeight: Number(latestWeight || profile.weight), targetWeight: Number(profile.targetWeight), goal: profile.goal || "lose", journeyStage: profile.journey?.stage || "starting", journeyWeeks: Number(profile.journey?.weeksBeforeJoining || 0), journeyStartingWeight: Number(profile.journey?.startingWeight || 0), journeyRecentChangeKg: Number(profile.journey?.recentChangeKg || 0), previousCalorieTarget: Number(profile.journey?.previousCalorieTarget || 0), plateauWeeks: Number(profile.journey?.plateauWeeks || 0), priorApproach: profile.journey?.priorApproach || "", mainChallenge: profile.journey?.mainChallenge || "", trainingExperience: profile.journey?.trainingExperience || "beginner", preferredPace: profile.journey?.preferredPace || "moderate", workouts: Number(profile.workouts || 2), workoutTypes: profile.workoutTypes || [] }); setNewCycleOpen(true); }}><span>↻</span><div><strong>המסלול שלי</strong><small>הגדר נקודת כניסה, מטרה, קצב ואימונים; כל ההיסטוריה נשמרת</small></div><b>‹</b></button>
            <button
              className="profile-sharing"
              type="button"
              onClick={() => setDark(!dark)}
            >
              <span>{dark ? "☀" : "◐"}</span>
              <div>
                <strong>ערכת תצוגה</strong>
                <small>
                  {dark
                    ? "ממשק כהה — לחץ למעבר לבהיר"
                    : "ממשק בהיר — לחץ למעבר לכהה"}
                </small>
              </div>
              <b>‹</b>
            </button>
            <section className="profile-data-actions">
              <a href="api/export" download><strong>ייצוא וגיבוי הנתונים</strong><small>הורדת עותק של הפרופיל, הארוחות והמדידות</small></a>
              <button type="button" onClick={deleteMyData}><strong>מחיקת החשבון לצמיתות</strong><small>דורש סיסמה ושני שלבי אישור · לא ניתן לשחזר</small></button>
            </section>
            </section>}
            <footer>
              <button type="button" onClick={switchUser}>
                החלף משתמש
              </button>
              <button className="primary" disabled={busy}>
                שמור ועדכן יעדים
              </button>
            </footer>
          </form>
        </div>
      )}
      {foodLibraryOpen && (
        <div className="modal-layer">
          <button
            className="backdrop"
            onClick={() => setFoodLibraryOpen(false)}
          />
          <section className="settings-modal food-library-modal">
            <header>
              <div>
                <p className="eyebrow">גישה מהירה</p>
                <h2>המועדפים שלי</h2>
              </div>
              <button onClick={() => setFoodLibraryOpen(false)}>×</button>
            </header>
            <div className="library-filters"><input type="search" value={libraryQuery} onChange={(e) => setLibraryQuery(e.target.value)} placeholder="חיפוש במועדפים" aria-label="חיפוש במועדפים" /></div>
            <div className="catalog-list">
              {(state.favorites || []).filter((favorite) => !libraryQuery.trim() || String(favorite.meal.name).includes(libraryQuery.trim())).map((favorite) => (
                <article key={favorite.id}>
                  <span className="favorite-mark">★</span>
                  <div>
                    <strong>{favorite.meal.name}</strong>
                    <small>{favorite.meal.kcal} kcal · {favorite.meal.protein || 0}g חלבון</small>
                  </div>
                  <button className="favorite-add" aria-label={`הוספת ${favorite.meal.name} להיום`} title="הוסף להיום" onClick={() => setPendingFavorite(favorite)}><AppIcon name="plus" /></button>
                  <button className="favorite-edit" aria-label={`עריכת ${favorite.meal.name}`} title="ערוך וחישוב ערכים" onClick={() => setPendingFavorite({ ...favorite, editing: true })}>✎</button>
                  <button className="favorite-remove" aria-label={`הסרת ${favorite.meal.name} מהמועדפים`} title="הסר מהמועדפים" onClick={() => removeFavorite(favorite.id)}>×</button>
                </article>
              ))}
              {!state.favorites?.length && <div className="favorites-empty"><span>☆</span><strong>עדיין אין מועדפים</strong><small>אפשר להוסיף ארוחה למועדפים מתוך פרטי הארוחה.</small></div>}
            </div>
          </section>
        </div>
      )}
      {pendingFavorite && <div className="modal-layer modal-nested"><button className="backdrop" onClick={() => setPendingFavorite(null)} /><section className="settings-modal compact-modal favorite-confirm"><header><div><h2>{pendingFavorite.editing ? "עריכת מועדף" : "להוסיף להיום?"}</h2><p>{pendingFavorite.meal.name}</p></div><button onClick={() => setPendingFavorite(null)}>×</button></header>{pendingFavorite.editing ? <div className="favorite-edit-form"><label>שם המאכל<input value={pendingFavorite.meal.name || ""} onChange={(e) => setPendingFavorite({ ...pendingFavorite, meal: { ...pendingFavorite.meal, name: e.target.value } })} /></label><div>{[["kcal","קלוריות"],["protein","חלבון"],["carbs","פחמימות"],["fat","שומן"]].map(([key,label]) => <label key={key}>{label}<input type="number" min="0" value={pendingFavorite.meal[key] || 0} onChange={(e) => setPendingFavorite({ ...pendingFavorite, meal: { ...pendingFavorite.meal, [key]: Number(e.target.value) } })} /></label>)}</div><button type="button" className="favorite-ai-calculate" disabled={busy} onClick={() => calculateFavorite(pendingFavorite)}>⌁ {busy ? "מחשב…" : "חשב ערכים עם AI"}</button></div> : <div><strong>{pendingFavorite.meal.kcal} קלוריות</strong><span>{pendingFavorite.meal.protein || 0}g חלבון · {pendingFavorite.meal.carbs || 0}g פחמימות · {pendingFavorite.meal.fat || 0}g שומן</span></div>}<footer><button onClick={() => setPendingFavorite(null)}>ביטול</button>{pendingFavorite.editing ? <button className="primary" onClick={() => saveFavorite(pendingFavorite)}>שמור שינויים</button> : <button className="primary" onClick={async () => { await repeatFavorite(pendingFavorite.id); setPendingFavorite(null); setFoodLibraryOpen(false); }}>＋ הוסף לארוחה</button>}</footer></section></div>}
      {editingFood && (
        <div className="modal-layer modal-nested">
          <button className="backdrop" onClick={() => setEditingFood(null)} />
          <form
            className="settings-modal compact-modal"
            onSubmit={saveEditedFood}
          >
            <header>
              <div>
                <p className="eyebrow">ספריית המאכלים</p>
                <h2>עריכת מאכל</h2>
              </div>
              <button type="button" onClick={() => setEditingFood(null)}>
                ×
              </button>
            </header>
            <div className="settings-grid">
              <label className="wide">תיאור חופשי<textarea value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} placeholder="למשל: הליכה מהירה 40 דקות עם עליות" /></label><button className="wide activity-ai-button" type="button" onClick={calculateActivityWithAi} disabled={busy}>חשב פעילות עם AI</button>{activityAiStatus && <p className="wide activity-ai-status">{activityAiStatus}</p>}
              <label className="wide">
                שם
                <input
                  value={editingFood.name}
                  onChange={(e) =>
                    setEditingFood({ ...editingFood, name: e.target.value })
                  }
                />
              </label>
              <label>
                קלוריות
                <input
                  type="number"
                  min="1"
                  value={editingFood.kcal}
                  onChange={(e) =>
                    setEditingFood({
                      ...editingFood,
                      kcal: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                חלבון
                <input
                  type="number"
                  min="0"
                  value={editingFood.protein}
                  onChange={(e) =>
                    setEditingFood({
                      ...editingFood,
                      protein: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                פחמימות
                <input
                  type="number"
                  min="0"
                  value={editingFood.carbs}
                  onChange={(e) =>
                    setEditingFood({
                      ...editingFood,
                      carbs: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                שומן
                <input
                  type="number"
                  min="0"
                  value={editingFood.fat}
                  onChange={(e) =>
                    setEditingFood({
                      ...editingFood,
                      fat: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="wide">
                הרשאה
                <select
                  value={editingFood.visibility}
                  onChange={(e) =>
                    setEditingFood({
                      ...editingFood,
                      visibility: e.target.value,
                    })
                  }
                >
                  <option value="private">פרטי</option>
                  <option value="shared">משותף</option>
                </select>
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setEditingFood(null)}>
                ביטול
              </button>
              <button className="primary" disabled={busy}>
                שמור שינויים
              </button>
            </footer>
          </form>
        </div>
      )}
      {historyOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setHistoryOpen(false)} />
          <section className="settings-modal history-modal">
            <header>
              <div>
                <p className="eyebrow">יומן תזונה</p>
                <h2>ציר הזמן שלי</h2>
              </div>
              <button onClick={() => setHistoryOpen(false)}>×</button>
            </header>
            <section className="history-calendar" aria-label="לוח שנה של ציונים יומיים">
              <header>
                <button type="button" onClick={() => moveHistoryMonth(-1)} aria-label="החודש הקודם">‹</button>
                <strong>{new Date(`${activeCalendarMonth}-01T12:00:00`).toLocaleDateString("he-IL", { month: "long", year: "numeric" })}</strong>
                <button type="button" onClick={() => moveHistoryMonth(1)} aria-label="החודש הבא">›</button>
              </header>
              <div className="calendar-weekdays">{["א", "ב", "ג", "ד", "ה", "ו", "ש"].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="calendar-grid">
                {calendarCells.map((date, index) => {
                  if (!date) return <i key={`empty-${index}`} />;
                  const day = historyDays.find((item) => item.date === date);
                  const score = Number(day?.dailyScore?.score || 0);
                  return <button type="button" key={date} className={`${day ? `score-${scoreToneFor(score)}` : "no-data"} ${date === activeHistoryDate ? "selected" : ""}`} onClick={() => day && setHistorySelectedDate(date)} disabled={!day} aria-label={day ? `${date}, ציון ${score}` : `${date}, אין נתונים`}><span>{Number(date.slice(-2))}</span>{day && <small>{score}</small>}</button>;
                })}
              </div>
            </section>
            <div className="history-days history-selected-day">
              {activeHistoryDay && [activeHistoryDay].map((day) => {
                  const totals = day.meals.reduce(
                    (sum: any, meal: any) => ({
                      kcal: sum.kcal + Number(meal.kcal || 0),
                      protein: sum.protein + Number(meal.protein || 0),
                      carbs: sum.carbs + Number(meal.carbs || 0),
                      fat: sum.fat + Number(meal.fat || 0),
                    }),
                    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
                  );
                  const goals = {
                    kcal: Number(profile.calories || 0),
                    protein: Number(profile.protein || 0),
                    carbs: Number(profile.carbs || 0),
                    fat: Number(profile.fat || 0),
                  };
                  const statuses = {
                    kcal: goalStatus(totals.kcal, goals.kcal),
                    protein: goalStatus(totals.protein, goals.protein),
                    carbs: goalStatus(totals.carbs, goals.carbs),
                    fat: goalStatus(totals.fat, goals.fat),
                  };
                  const timelineEntries = [...day.meals.filter((meal: any) => !meal.beverageEntry).map((meal: any) => ({ ...meal, kind: "meal" })), ...(day.waterEvents || []).map((event: any) => ({ ...event, kind: "water", name: event.beverageName || "כוס מים" }))].sort((a: any, b: any) => String(a.time).localeCompare(String(b.time)));
                  return (
                    <details key={day.date} open>
                      <summary>
                        <div>
                          <strong>
                            {new Date(
                              `${day.date}T12:00:00`,
                            ).toLocaleDateString("he-IL", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </strong>
                          <small>
                            {day.meals.filter((meal: any) => !meal.beverageEntry).length} ארוחות · {day.waterMl || 0} מ״ל
                            מים
                          </small>
                        </div>
                        <span
                          className={`history-calories score-${scoreToneFor(Number(day.dailyScore?.score || 0))}`}
                        >
                          <b>
                            {totals.kcal.toLocaleString()} /{" "}
                            {goals.kcal.toLocaleString()}
                          </b>
                          <small>kcal · ציון {Number(day.dailyScore?.score || 0)}/100</small>
                        </span>
                      </summary>
                      <div className="history-summary">
                        <span className={statuses.protein.className}>
                          חלבון{" "}
                          <b>
                            {totals.protein} / {goals.protein}g
                          </b>
                          <small>{statuses.protein.label}</small>
                        </span>
                        <span className={statuses.carbs.className}>
                          פחמימות{" "}
                          <b>
                            {totals.carbs} / {goals.carbs}g
                          </b>
                          <small>{statuses.carbs.label}</small>
                        </span>
                        <span className={statuses.fat.className}>
                          שומן{" "}
                          <b>
                            {totals.fat} / {goals.fat}g
                          </b>
                          <small>{statuses.fat.label}</small>
                        </span>
                      </div>
                      <p className={`history-day-score-summary score-${scoreToneFor(Number(day.dailyScore?.score || 0))}`}><strong>סיכום היום</strong><span>{historyScoreText(day)}</span></p>
                      <section className="history-score-analysis">
                        <h4>פירוט הציון</h4>
                        <div>{(day.dailyScore?.parameters || []).filter((part: any) => part.available).map((part: any) => <span key={part.key}><strong>{part.label}</strong><i><b style={{ width: `${part.percent}%` }} /></i><em>{part.percent}% · {Math.round(Number(part.value || 0))}/{Math.round(Number(part.target || 0))} {part.unit}</em></span>)}</div>
                        <small>הציון מחושב אוטומטית במנוע 2.0 · כיסוי הנתונים: {Number(day.dailyScore?.coverage || 0)}%. נתון שלא תועד אינו מוצג כאילו נכשל.</small>
                      </section>
                      <section className="history-timeline">
                        {timelineEntries.map((meal: any) => meal.kind === "water" ? <article className="timeline-water" key={meal.id || meal.time}><time>{new Date(meal.time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</time><i /><span className="timeline-icon">{meal.icon || "💧"}</span><div><em>שתייה</em><strong>{meal.beverageName || "כוס מים"}</strong><small>{meal.amount} מ״ל{meal.hydrationMl && Number(meal.hydrationMl) !== Number(meal.amount) ? ` · ${meal.hydrationMl} מ״ל למיכל` : ""}</small></div><b>{meal.amount}<small> מ״ל</small></b><button className="history-delete-entry" type="button" onClick={() => deleteHistoryEntry("water", String(meal.id || meal.time), day.date)} aria-label={`מחיקת ${meal.beverageName || "כוס המים"}`}>מחיקה</button></article> : (
                            <article
                              className={`timeline-${meal.period || "snack"}`}
                              key={meal.id}
                            >
                              <time>
                                {new Date(meal.time).toLocaleTimeString(
                                  "he-IL",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </time>
                              <i />
                              {meal.image ? (
                                <button className="timeline-image-button" type="button" onClick={() => openMealPreview(meal, true)} aria-label={`הצגת ${meal.name}`}><img src={meal.image} alt="" loading="lazy" decoding="async" /></button>
                              ) : (
                                <button className="timeline-image-button timeline-icon" type="button" onClick={() => openMealPreview(meal, true)} aria-label={`הצגת ${meal.name}`}>🍽</button>
                              )}
                              <div>
                                <em>{periodLabels[meal.period || "snack"]}</em>
                                <strong>{meal.name}</strong>
                                <small>
                                  {meal.protein}g חלבון · {meal.carbs}g פחמימות
                                  · {meal.fat}g שומן
                                </small>
                              </div>
                              <b>
                                {meal.kcal}
                                <small> kcal</small>
                              </b>
                              <button className="history-delete-entry" type="button" onClick={() => deleteHistoryEntry("meal", meal.id, day.date)} aria-label={`מחיקת ${meal.name}`}>מחיקה</button>
                            </article>
                          ))}
                      </section>
                    </details>
                  );
                })}
            </div>
          </section>
        </div>
      )}
      {activityOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setActivityOpen(false)} />
          <form className="settings-modal compact-modal" onSubmit={addActivity}>
            <header>
              <div>
                <p className="eyebrow">מעקב יומי</p>
                <h2>הוספת פעילות</h2>
              </div>
              <button type="button" onClick={() => setActivityOpen(false)}>
                ×
              </button>
            </header>
            <div className="activity-quick-types" aria-label="בחירת סוג אימון">{["אימון כוח","הליכה","ריצה","רכיבה","שחייה"].map((type) => <button key={type} type="button" className={activityForm.type === type ? "selected" : ""} onClick={() => setActivityForm({ ...activityForm, type })}>{type}</button>)}</div>
            <div className="activity-essential-fields"><div className="activity-duration-field"><span>משך האימון</span><div><button type="button" aria-label="הפחת חמש דקות" onClick={() => setActivityForm({ ...activityForm, minutes: Math.max(5, activityForm.minutes - 5) })}>−</button><strong>{activityForm.minutes} דקות</strong><button type="button" aria-label="הוסף חמש דקות" onClick={() => setActivityForm({ ...activityForm, minutes: Math.min(600, activityForm.minutes + 5) })}>+</button></div></div><label>עצימות<select value={activityForm.intensity} onChange={(e) => setActivityForm({ ...activityForm, intensity: e.target.value })}><option value="low">קלה</option><option value="medium">בינונית</option><option value="high">גבוהה</option></select></label></div>
            <details className="activity-advanced"><summary>פרטים נוספים — לא חובה</summary><div className="settings-grid">
              <label>
                צעדים
                <input
                  type="number"
                  min="0"
                  value={activityForm.steps}
                  onChange={(e) =>
                    setActivityForm({
                      ...activityForm,
                      steps: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                מרחק בק״מ
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={activityForm.distanceKm}
                  onChange={(e) =>
                    setActivityForm({
                      ...activityForm,
                      distanceKm: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="wide">
                קלוריות פעילות — אופציונלי
                <input
                  type="number"
                  min="0"
                  value={activityForm.activeCalories}
                  onChange={(e) =>
                    setActivityForm({
                      ...activityForm,
                      activeCalories: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div></details>
            <p className="modal-help">
              קלוריות פעילות מוצגות בנפרד ואינן מתווספות אוטומטית לתקציב האכילה.
            </p>
            <footer>
              <button type="button" onClick={() => setActivityOpen(false)}>
                ביטול
              </button>
              <button className="primary" disabled={busy}>
                שמור פעילות
              </button>
            </footer>
          </form>
        </div>
      )}
      {insightsOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setInsightsOpen(false)} />
          <section className={`settings-modal insights-modal ${!insightsData ? "loading" : ""}`}>
            <header>
              <div>
                <h2>מגמות ותובנות</h2>
              </div>
              <button onClick={() => setInsightsOpen(false)}>×</button>
            </header>
            {insightsData?.goalPlan && <section className="goal-plan-card">
              <header><div><small>המסלול שלי</small><h3>{insightsData.goalPlan.mode.label}</h3></div><b>{insightsData.goalPlan.calibration.level}</b></header>
              <div className="goal-plan-calibration"><span><i style={{ width: `${insightsData.goalPlan.calibration.score}%` }} /></span><strong>{insightsData.goalPlan.calibration.score}/100</strong></div>
              <div className="goal-plan-metrics"><span><small>קצב המסלול</small><strong>{insightsData.goalPlan.targetWeeklyKg > 0 ? "+" : ""}{insightsData.goalPlan.targetWeeklyKg} ק״ג/שבוע</strong></span><span><small>קצב בפועל</small><strong>{insightsData.goalPlan.observedWeeklyKg == null ? "עוד אין מגמה" : `${insightsData.goalPlan.observedWeeklyKg > 0 ? "+" : ""}${insightsData.goalPlan.observedWeeklyKg} ק״ג/שבוע`}</strong></span><span><small>עקביות תיעוד</small><strong>{insightsData.goalPlan.adherence}%</strong></span><span><small>מדידות</small><strong>{insightsData.goalPlan.measurements}</strong></span></div>
              <p>{insightsData.goalPlan.status}</p>
              {insightsData.goalPlan.calibration.missing?.length > 0 && <ul>{insightsData.goalPlan.calibration.missing.map((item: string) => <li key={item}>{item}</li>)}</ul>}
              {insightsData.goalPlan.proposal && <article className="goal-adjustment-proposal"><strong>{insightsData.goalPlan.proposal.title}</strong><p>{insightsData.goalPlan.proposal.currentCalories.toLocaleString()} ← {insightsData.goalPlan.proposal.suggestedCalories.toLocaleString()} קלוריות</p><small>שינוי קטן של {Math.abs(insightsData.goalPlan.proposal.delta)} קלוריות בלבד. שום יעד לא משתנה ללא אישורך.</small><button type="button" disabled={busy} onClick={acceptGoalAdjustment}>אשר התאמה</button></article>}
            </section>}
            {insightsData?.weeklyInsight && <section className="weekly-insight-card"><span>✦</span><div><small>תובנת השבוע שלך</small><strong>{insightsData.weeklyInsight}</strong><em>מחושב מקומית מהתיעוד שלך, ללא קריאת AI נוספת</em></div></section>}
            <section className="weight-trends">
              <div className="weight-trends-heading">
                <div><strong>מעקב משקל</strong><small>כל עדכון נשמר כמדידה חדשה לפי תאריך ואינו מוחק את ההיסטוריה</small></div>
                <b>{latestWeight ? `${Number(latestWeight).toFixed(1)} ק״ג` : "אין מדידה"}{latestWeightDelta !== null ? <small className={latestWeightDelta > 0 ? "weight-up" : latestWeightDelta < 0 ? "weight-down" : "weight-steady"}><span aria-hidden="true">{latestWeightDelta > 0 ? "↑" : latestWeightDelta < 0 ? "↓" : "→"}</span> {Math.abs(latestWeightDelta).toFixed(1)} ק״ג <em>מהקודם</em></small> : <small className="weight-steady">אין מדידה קודמת</small>}</b>
              </div>
              {initialWeight > 0 && targetWeight > 0 && <section className="weight-goal-axis" aria-label="ציר התקדמות ממשקל התחלתי למשקל יעד"><header><span><small>משקל הזנה</small><strong>{initialWeight.toFixed(1)}</strong></span><b>{weightGoalProgress}% בדרך ליעד</b><span><small>משקל יעד</small><strong>{targetWeight.toFixed(1)}</strong></span></header><div><i style={{ width: `${weightGoalProgress}%` }} /><em style={{ insetInlineStart: `${weightGoalProgress}%` }}>{Number(latestWeight).toFixed(1)}</em></div><footer><small>התחלה</small><strong>משקל נוכחי</strong><small>יעד</small></footer></section>}
              <form className="weight-update-form" onSubmit={saveTrendWeight}>
                <label>משקל נוכחי<input type="number" min="25" max="350" step="0.1" value={weightValue || ""} onChange={(event) => setWeightValue(Number(event.target.value))} /></label>
                <label>תאריך המדידה<input type="date" value={weightDate} max={state.today?.date} onChange={(event) => setWeightDate(event.target.value)} /></label>
                <button className="primary" disabled={busy}>{busy ? "שומר…" : "שמור מדידה"}</button>
              </form>
              {weightFeedback && <p className="weight-feedback" role="status">{weightFeedback}</p>}
              {weightChartPoints.length > 1 ? (
                <div className="weight-history-chart">
                  <svg viewBox="0 0 600 160" role="img" aria-label="גרף היסטוריית משקל">
                    <polyline points={weightChartPoints.map((point: any) => `${point.x},${point.y}`).join(" ")} />
                    {weightChartPoints.map((point: any) => <g className="weight-chart-point" key={point.id || point.date}><circle cx={point.x} cy={point.y} r="6" /><rect x={point.x - 24} y={point.y - 36} width="48" height="25" rx="9" /><text x={point.x} y={point.y - 18}>{Number(point.weight).toFixed(1)}</text></g>)}
                  </svg>
                  <div className="weight-chart-dates"><span>{new Date(`${visibleWeightEntries[0].date}T12:00:00`).toLocaleDateString("he-IL")}</span><strong>{weightChange === 0 ? "ללא שינוי" : `${weightChange > 0 ? "+" : ""}${weightChange} ק״ג`}</strong><span>{new Date(`${visibleWeightEntries.at(-1).date}T12:00:00`).toLocaleDateString("he-IL")}</span></div>
                </div>
              ) : <p className="trend-empty">לאחר שתי מדידות יוצג כאן גרף שינוי ברור. המדידה הקיימת נשמרת.</p>}
              {visibleWeightEntries.length > 0 && <div className="weight-history-list">{[...visibleWeightEntries].reverse().slice(0, 5).map((entry: any, index: number, entries: any[]) => { const previous = entries[index + 1]; const delta = previous ? Number(entry.weight) - Number(previous.weight) : 0; return <span key={entry.id || entry.date}><small>{new Date(`${entry.date}T12:00:00`).toLocaleDateString("he-IL")}</small><strong>{Number(entry.weight).toFixed(1)} ק״ג</strong><b>{previous ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` : "מדידה ראשונה"}</b></span>; })}</div>}
            </section>
            {!insightsData ? (
              <div className="insights-loading" role="status" aria-live="polite"><span /><strong>מכין את תמונת המגמות שלך</strong><small>מחשב נתונים ומסדר את הגרפים…</small><i><b /></i></div>
            ) : (
              <>
                <div className="hydration-period-switch" role="tablist" aria-label="טווח מגמות השתייה">{([['day','יומי'],['week','שבועי'],['month','חודשי']] as const).map(([period,label]) => <button key={period} type="button" role="tab" aria-selected={hydrationTrendPeriod === period} className={hydrationTrendPeriod === period ? "active" : ""} onClick={() => setHydrationTrendPeriod(period)}>{label}</button>)}</div>
                <section className="hydration-mix-insight"><header><strong>הרכב השתייה שלך</strong><small>תרומת המשקאות למיכל הנוזלים · {hydrationTrendLabel}</small></header>{hydrationTrendTotal > 0 ? <div className="hydration-pitcher-layout"><div className="hydration-pitcher" aria-label="התפלגות משקאות"><div className="hydration-liquid">{hydrationTrendLayers.slice().reverse().map((item, index) => <i key={item.id} style={{ height: `${item.amount / hydrationTrendTotal * 100}%`, "--layer-color": item.color, "--layer-delay": `${index * 110}ms` } as CSSProperties} />)}</div></div><div className="hydration-legend">{hydrationTrendLayers.map((item) => <span key={item.id}><i style={{ background: item.color }} /><b>{item.icon} {item.name}</b><strong>{item.amount.toLocaleString()} מ״ל</strong><small>{Math.round(item.amount / hydrationTrendTotal * 100)}%</small></span>)}</div></div> : <p>לא נמצאו משקאות בטווח שנבחר.</p>}</section>
                <section className="water-hours-insight"><header><strong>מתי שותים הכי הרבה?</strong><small>התפלגות השתייה לפי שעות · {hydrationTrendLabel} · כוס מחושבת כ־250 מ״ל</small></header><div>{waterByHour.map((item) => { const cups = Math.round(Number(item.amount || 0) / 250); return <span key={item.hour} title={`${String(item.hour).padStart(2,"0")}:00 · ${item.amount} מ״ל · ${cups} כוסות`}><i style={{ height: `${item.amount ? Math.max(6, item.amount / maximumWaterHour * 100) : 2}%` }}>{cups > 1 && <b>{cups}</b>}</i><small>{item.hour % 3 === 0 ? String(item.hour).padStart(2,"0") : ""}</small></span>; })}</div>{!waterByHour.some((item) => item.amount > 0) && <p>אין עדיין נתוני שתייה בטווח שנבחר.</p>}</section>
                {insightsData.sugar?.enabled && (
                  <section className="sugar-insights">
                    <header><div><strong>סוכרים תזונתיים משוערים</strong><small>מוצג בגלל מצב הסוכר שסומן בכרטיס האישי</small></div><b>לא גלוקוז בדם</b></header>
                    <div className="sugar-periods"><span><small>היום</small><strong>{insightsData.sugar.today == null ? "אין נתונים" : `${insightsData.sugar.today}g`}</strong></span><span><small>ממוצע 7 ימים</small><strong>{insightsData.sugar.weeklyAverage == null ? "אין נתונים" : `${insightsData.sugar.weeklyAverage}g`}</strong></span><span><small>ממוצע 30 ימים</small><strong>{insightsData.sugar.monthlyAverage == null ? "אין נתונים" : `${insightsData.sugar.monthlyAverage}g`}</strong></span></div>
                    {insightsData.sugar.days.some((day: any) => day.coverage > 0) ? <div className="sugar-chart" aria-label="גרף צריכת סוכרים תזונתיים ל־30 ימים">{insightsData.sugar.days.map((day: any) => { const maximum = Math.max(1, ...insightsData.sugar.days.map((item: any) => Number(item.sugar || 0))); return <span key={day.date} title={`${day.date}: ${day.sugar} גרם`}><i style={{ height: `${day.coverage ? Math.max(4, day.sugar / maximum * 100) : 0}%` }} /><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}</small></span>; })}</div> : <p className="trend-empty">עדיין אין מספיק ארוחות עם נתון סוכר מאומת. ארוחות חדשות ממקורות תזונה תואמים יצברו נתונים אוטומטית.</p>}
                    <p className="sugar-disclaimer">זהו סך הסוכרים במזון לפי נתוני הקטלוג הזמינים, לא סוכר מוסף ולא מדידת גלוקוז. כיסוי הנתונים בחודש: {insightsData.sugar.coverage}%.</p>
                  </section>
                )}
                <div className="trend-summary">
                  <article className={`kpi-score score-${scoreToneFor(insightsData.summary.weeklyScore || 0)}`}><i>◎</i>
                    <small>ציון שבועי</small>
                    <strong>{insightsData.summary.weeklyScore || "—"}</strong>
                    <span>
                      {insightsData.summary.previousWeeklyScore
                        ? `${insightsData.summary.weeklyScore >= insightsData.summary.previousWeeklyScore ? "↑" : "↓"} משבוע קודם`
                        : "נדרשים עוד ימים"}
                    </span>
                  </article>
                  <article className={Number(insightsData.summary.averageCalories) / Math.max(1, Number(profile.calories)) >= .9 && Number(insightsData.summary.averageCalories) / Math.max(1, Number(profile.calories)) <= 1.05 ? "kpi-calories is-good" : "kpi-calories needs-attention"}><i>🔥</i>
                    <small>ממוצע קלוריות</small>
                    <strong>{insightsData.summary.averageCalories}</strong>
                    <span>ליום, 7 ימים</span>
                  </article>
                  <article className={Number(insightsData.summary.averageProtein) >= Number(profile.protein) * .9 ? "kpi-protein is-good" : "kpi-protein needs-attention"}><i>●</i>
                    <small>חלבון ממוצע</small>
                    <strong>{insightsData.summary.averageProtein} גרם</strong>
                    <span>ליום</span>
                  </article>
                  <article className={Number(insightsData.summary.activeMinutes) >= 120 ? "kpi-activity is-good" : "kpi-activity needs-attention"}><i>↗</i>
                    <small>פעילות</small>
                    <strong>{insightsData.summary.activeMinutes}</strong>
                    <span>דקות השבוע</span>
                  </article>
                  <article className={Number(insightsData.summary.targetCompliance) >= 70 ? "kpi-range is-good" : "kpi-range needs-attention"}><i>✓</i><small>ימים בטווח</small><strong>{insightsData.summary.targetCompliance}%</strong><span>{insightsData.summary.trackedDays} ימי מעקב</span></article>
                  <article className={`kpi-meal ${insightsData.summary.topMealDetails?.id ? "is-clickable" : ""}`} role={insightsData.summary.topMealDetails?.id ? "button" : undefined} tabIndex={insightsData.summary.topMealDetails?.id ? 0 : undefined} onClick={openTopMealPreview} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && insightsData.summary.topMealDetails?.id) { event.preventDefault(); openTopMealPreview(); } }} aria-label={insightsData.summary.topMealDetails?.id ? `פתיחת פרטי ${insightsData.summary.topMeal}` : undefined}><i>★</i><small>הארוחה המאוזנת</small><strong className="trend-meal-name" title={insightsData.summary.topMeal}>{String(insightsData.summary.topMeal || "—").length > 42 ? `${String(insightsData.summary.topMeal).slice(0, 39).trim()}…` : insightsData.summary.topMeal}</strong><span>{insightsData.summary.topMealDetails?.id ? "לחץ להצגת הארוחה" : "לפי ציון הארוחה"}</span></article>
                </div>
                <p className="trend-narrative">{insightsData.narrative}</p>
                <p className="coach-recommendation"><b>המלצת זהב:</b> {insightsData.recommendation}</p>
                <section className="trend-comparison">
                  <header><div><strong>תמונת מצב ל־30 ימים</strong><small>המסלול שלך במבט אחד · רק ימים מתועדים נכנסים לממוצע</small></div><b className={Number(insightsData.summary.calorieWeeklyChange || 0) <= 0 ? "down" : "up"}>{Number(insightsData.summary.calorieWeeklyChange || 0) === 0 ? "→ יציב" : Number(insightsData.summary.calorieWeeklyChange || 0) > 0 ? "↗ מגמת עלייה" : "↘ מגמת ירידה"}</b></header>
                  <div className="trend-live-chart" aria-label="גרף הציון ב־30 הימים האחרונים">
                    {trend30Points.length ? <>
                      <div className="trend-chart-scale" aria-hidden="true"><span>100</span><span>50</span><span>0</span></div>
                      <svg viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label="מגמת הציון היומי">
                        <defs><linearGradient id="trend30Fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#55bfe6" stopOpacity=".48"/><stop offset="1" stopColor="#55bfe6" stopOpacity=".02"/></linearGradient><linearGradient id="trend30Stroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8b6bd1"/><stop offset=".5" stopColor="#55bfe6"/><stop offset="1" stopColor="#51b77c"/></linearGradient></defs>
                        <g className="trend-grid-lines"><line x1="24" y1="30" x2="576" y2="30"/><line x1="24" y1="86" x2="576" y2="86"/><line x1="24" y1="142" x2="576" y2="142"/></g>
                        <polygon className="trend-area" points={trend30Area}/>
                        <polyline className="trend-line" points={trend30Line}/>
                        {trend30Points.map((point: any, index: number) => <g className="trend-point" style={{ "--point-delay": `${420 + index * 28}ms` } as React.CSSProperties} key={point.date}><circle cx={point.x} cy={point.y} r="5"/><title>{`${new Date(`${point.date}T12:00:00`).toLocaleDateString("he-IL")}: ציון ${point.score || 0}`}</title></g>)}
                      </svg>
                      <div className="trend-chart-dates"><span>{new Date(`${trend30Points[0].date}T12:00:00`).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}</span><strong>ציון יומי</strong><span>{new Date(`${trend30Points.at(-1).date}T12:00:00`).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}</span></div>
                    </> : <p className="trend-empty">הגרף יתחיל להיבנות לאחר תיעוד היום הראשון.</p>}
                  </div>
                  <div>
                    <span className="metric-tracking"><small>ימי מעקב</small><strong>{insightsData.summary.monthlyTrackedDays} מתוך 30 ימים</strong></span>
                    <span className="metric-calories"><small>קלוריות בממוצע</small><strong>{Number(insightsData.summary.monthlyAverageCalories || 0).toLocaleString()} קלוריות</strong></span>
                    <span className="metric-protein"><small>חלבון בממוצע</small><strong>{insightsData.summary.monthlyAverageProtein} גרם</strong></span>
                    <span className="metric-water"><small>מים בממוצע</small><strong>{Number(insightsData.summary.monthlyAverageWater || 0).toLocaleString()} מ״ל</strong></span>
                    <span className="metric-weight"><small>משקל נוכחי מול ההתחלה</small><strong>{insightsData.summary.referenceWeight ? `${Number(insightsData.summary.currentWeight).toFixed(1)} מול ${Number(insightsData.summary.referenceWeight).toFixed(1)} ק״ג` : "אין ייחוס"}</strong></span>
                    <span className="metric-change"><small>שינוי קלורי מול שבוע קודם</small><strong>{insightsData.summary.previousAverageCalories ? `${insightsData.summary.calorieWeeklyChange > 0 ? "+" : ""}${insightsData.summary.calorieWeeklyChange} קלוריות` : "אין מספיק נתונים"}</strong></span>
                  </div>
                </section>
                <section className="weekly-goal-progress">
                  <header><strong>ממוצע 7 ימים מול היעדים שלך</strong><small>הפס מציג אחוז מהיעד; המספרים מראים בפועל מול היעד</small></header>
                  {[
                    { label: "קלוריות ליום", actual: insightsData.summary.averageCalories, target: profile.calories, unit: "קלוריות", note: "טווח רצוי: 90%–105% מהיעד", tone: "calories" },
                    { label: "חלבון ליום", actual: insightsData.summary.averageProtein, target: profile.protein, unit: "גרם", note: "לפחות 90% מהיעד תומך בשובע ובשמירת שריר", tone: "protein" },
                    { label: "פחמימות ליום", actual: insightsData.summary.averageCarbs, target: profile.carbs, unit: "גרם", note: "ממוצע יומי מול היעד האישי", tone: "carbs" },
                    { label: "שומן ליום", actual: insightsData.summary.averageFat, target: profile.fat, unit: "גרם", note: "ממוצע יומי מול היעד האישי", tone: "fat" },
                    { label: "מים ליום", actual: insightsData.summary.averageWater, target: profile.waterMl, unit: "מ״ל", note: "ממוצע השתייה בימים האחרונים", tone: "water" },
                    { label: "פעילות שבועית", actual: insightsData.summary.activeMinutes, target: 150, unit: "דק׳", note: "יעד בסיס שימושי: 150 דקות בשבוע", tone: "activity" },
                  ].map((metric) => { const percent = Math.round(Number(metric.actual || 0) / Math.max(1, Number(metric.target || 0)) * 100); const upper = metric.tone === "calories" ? 105 : metric.tone === "activity" || metric.tone === "water" ? 130 : 115; const status = percent < 70 ? "needs-work" : percent < 90 ? "close" : percent <= upper ? "strong" : "over"; const statusLabel = status === "needs-work" ? "דורש שיפור" : status === "close" ? "מתקרב ליעד" : status === "strong" ? "בטווח טוב" : "מעל הטווח"; return <article className={`goal-progress ${metric.tone} metric-${status}`} key={metric.label}><div><strong>{metric.label}</strong><b>{Number(metric.actual || 0).toLocaleString()} / {Number(metric.target || 0).toLocaleString()} {metric.unit}</b></div><span><i style={{ width: `${Math.min(100, percent)}%` }} /></span><footer><small>{metric.note}</small><em>{statusLabel} · {percent}%</em></footer></article>; })}
                </section>
                <section className="daily-score-history">
                  <header><strong>ציון יומי — 14 ימים אחרונים</strong><small>לחיצה על יום בלוח ההיסטוריה מציגה את הסיבות לציון</small></header>
                  <div>{insightsData.daily.slice(-14).map((day: any) => <span className={`score-${scoreToneFor(day.score)}`} key={day.date}><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}</small><strong>{day.score}</strong></span>)}</div>
                </section>
              </>
            )}
          </section>
        </div>
      )}
      {newCycleOpen && <div className="modal-layer"><button className="backdrop" onClick={() => setNewCycleOpen(false)} /><form className="settings-modal new-cycle-modal journey-wizard" onSubmit={startNewCycle}><header><div><h2>המסלול שלי</h2><small>טופס קצר וברור להתאמה לפי המקום שבו אתה נמצא עכשיו</small></div><button type="button" onClick={() => setNewCycleOpen(false)}>×</button></header>
        <div className="journey-form-sections">
          <section><header><b>1</b><div><strong>איפה אתה בתהליך?</strong><small>כך לא נניח שהכול התחיל ביום ההצטרפות</small></div></header><div className="journey-stage-grid">{Object.entries(journeyStageLabels).map(([key,label]) => <button type="button" key={key} className={newCycleForm.journeyStage === key ? "selected" : ""} onClick={() => setNewCycleForm({ ...newCycleForm, journeyStage: key })}>{label}</button>)}</div>{newCycleForm.journeyStage !== "starting" && <div className="journey-existing-details"><p>כדי להבין את מצבך לפני ההצטרפות — מלא רק מה שידוע לך.</p><div className="settings-grid"><label>כמה שבועות אתה כבר בתהליך?<input type="number" min="0" max="520" value={newCycleForm.journeyWeeks} onChange={(e) => setNewCycleForm({ ...newCycleForm, journeyWeeks: Number(e.target.value) })} /></label><label>משקל בתחילת התהליך<input type="number" min="25" max="350" step=".1" value={newCycleForm.journeyStartingWeight || ""} onChange={(e) => setNewCycleForm({ ...newCycleForm, journeyStartingWeight: Number(e.target.value) })} /></label><label>שינוי משוער ב־4 השבועות האחרונים (ק״ג)<input type="number" min="-20" max="20" step=".1" value={newCycleForm.journeyRecentChangeKg || ""} onChange={(e) => setNewCycleForm({ ...newCycleForm, journeyRecentChangeKg: Number(e.target.value) })} /><small>מינוס לירידה, פלוס לעלייה</small></label><label>יעד קלורי קודם — אם היה<input type="number" min="800" max="6000" value={newCycleForm.previousCalorieTarget || ""} onChange={(e) => setNewCycleForm({ ...newCycleForm, previousCalorieTarget: Number(e.target.value) })} /></label>{newCycleForm.journeyStage === "plateau" && <label>כמה שבועות אין שינוי משמעותי?<input type="number" min="1" max="52" value={newCycleForm.plateauWeeks || ""} onChange={(e) => setNewCycleForm({ ...newCycleForm, plateauWeeks: Number(e.target.value) })} /></label>}<label>מה ניסית עד עכשיו?<select value={newCycleForm.priorApproach} onChange={(e) => setNewCycleForm({ ...newCycleForm, priorApproach: e.target.value })}><option value="">לא בחרתי</option><option value="calorie_tracking">ספירת קלוריות</option><option value="meal_plan">תפריט קבוע</option><option value="intuitive">אכילה אינטואיטיבית</option><option value="low_carb">הפחתת פחמימות</option><option value="other">שיטה אחרת</option></select></label><label className="wide">מה הקושי המרכזי כרגע?<textarea value={newCycleForm.mainChallenge} maxLength={300} onChange={(e) => setNewCycleForm({ ...newCycleForm, mainChallenge: e.target.value })} placeholder="למשל: רעב בערב, חוסר עקביות, קושי להגיע לחלבון או תקיעות במשקל" /></label></div><small>המידע הוא דיווח עצמי ומשמש להבנת ההקשר בלבד. המנוע ילמד התאמות מנתונים שייאספו באפליקציה.</small></div>}</section>
          <section><header><b>2</b><div><strong>מטרה וקצב</strong><small>המנוע יתחיל מנקודת פתיחה שמרנית</small></div></header><label>מטרת המסלול<select value={newCycleForm.goal} onChange={(e) => setNewCycleForm({ ...newCycleForm, goal: e.target.value })}>{Object.entries(goalLabels).map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label><div className="journey-pace-grid">{[["gentle","רגוע","פחות שינויים, קל יותר להתמיד"],["moderate","מתון","איזון בין קצב להתמדה"],["focused","ממוקד","עדיין בגבולות שמרניים"]].map(([key,title,help]) => <button type="button" key={key} className={newCycleForm.preferredPace === key ? "selected" : ""} onClick={() => setNewCycleForm({ ...newCycleForm, preferredPace: key })}><strong>{title}</strong><small>{help}</small></button>)}</div><div className="settings-grid"><label>משקל נוכחי<input type="number" min="25" max="350" step=".1" value={newCycleForm.currentWeight} onChange={(e) => setNewCycleForm({ ...newCycleForm, currentWeight: Number(e.target.value) })} /></label><label>משקל יעד<input type="number" min="25" max="350" step=".1" value={newCycleForm.targetWeight} onChange={(e) => setNewCycleForm({ ...newCycleForm, targetWeight: Number(e.target.value) })} /></label></div></section>
          <section><header><b>3</b><div><strong>ניסיון ואימונים</strong><small>המלצות המאמן יתאימו לשגרה האמיתית שלך</small></div></header><div className="settings-grid"><label>ניסיון באימוני כוח<select value={newCycleForm.trainingExperience} onChange={(e) => setNewCycleForm({ ...newCycleForm, trainingExperience: e.target.value })}><option value="beginner">מתחיל/ה</option><option value="intermediate">ביניים</option><option value="advanced">מתקדם/ת</option><option value="none">לא מבצע/ת אימוני כוח</option></select></label><label>אימונים בשבוע<input type="number" min="0" max="14" value={newCycleForm.workouts} onChange={(e) => setNewCycleForm({ ...newCycleForm, workouts: Number(e.target.value) })} /></label></div><fieldset className="onboarding-choice-field"><legend>סוגי אימון</legend><div className="profile-choice-chips">{Object.entries(workoutTypeLabels).map(([key,label]) => <button type="button" key={key} className={newCycleForm.workoutTypes.includes(key) ? "selected" : ""} onClick={() => setNewCycleForm({ ...newCycleForm, workoutTypes: newCycleForm.workoutTypes.includes(key) ? newCycleForm.workoutTypes.filter((item) => item !== key) : [...newCycleForm.workoutTypes, key] })}>{label}</button>)}</div></fieldset></section>
        </div><p className="modal-help">הנתונים שלא ידועים יכולים להישאר ריקים. המערכת לא תשלים היסטוריה שלא הוזנה ולא תשנה יעד ללא אישור.</p><footer><button type="button" onClick={() => setNewCycleOpen(false)}>ביטול</button><button className="primary" disabled={busy}>שמור והתחל מסלול</button></footer></form></div>}
      {partnerOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setPartnerOpen(false)} />
          <section className="settings-modal partner-modal">
            <header>
              <div>
                <p className="eyebrow">מעקב משותף</p>
                <h2>שותף לתהליך</h2>
              </div>
              <button onClick={() => setPartnerOpen(false)}>×</button>
            </header>
            <p className="modal-help">בחר משתמש אחד או יותר. מוצגים שמות משתמש בלבד, והשיתוף יתחיל לאחר אישור כל משתמש.</p>
            <form className="partner-invite" onSubmit={invitePartner}>
              <div className="partner-user-picker" role="group" aria-label="בחירת משתמשים לשיתוף">
                {(state.shareCandidates || []).map((candidate) => {
                  const selected = partnerForm.userIds.includes(candidate.id);
                  return <button key={candidate.id} type="button" className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => setPartnerForm({ ...partnerForm, userIds: selected ? partnerForm.userIds.filter((id) => id !== candidate.id) : [...partnerForm.userIds, candidate.id] })}><span>{candidate.name.slice(0, 1)}</span><strong>{candidate.name}</strong><i>{selected ? "✓" : "+"}</i></button>;
                })}
                {!state.shareCandidates?.length && <p>אין כרגע משתמשים נוספים שאפשר להזמין.</p>}
              </div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={partnerForm.daily}
                    onChange={(e) =>
                      setPartnerForm({
                        ...partnerForm,
                        daily: e.target.checked,
                      })
                    }
                  />{" "}
                  סיכום יומי
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={partnerForm.meals}
                    onChange={(e) =>
                      setPartnerForm({
                        ...partnerForm,
                        meals: e.target.checked,
                      })
                    }
                  />{" "}
                  פירוט ארוחות
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={partnerForm.weight}
                    onChange={(e) =>
                      setPartnerForm({
                        ...partnerForm,
                        weight: e.target.checked,
                      })
                    }
                  />{" "}
                  משקל
                </label>
                <label><input type="checkbox" checked={partnerForm.trends} onChange={(e) => setPartnerForm({ ...partnerForm, trends: e.target.checked })} /> מגמות וציונים</label>
              </div>
              <button className="primary" disabled={busy || !partnerForm.userIds.length}>
                שלח הזמנה ל־{partnerForm.userIds.length || 0} משתמשים
              </button>
            </form>
            <div className="partner-links">
              {(state.partnerships || [])
                .filter((link) => link.status !== "revoked")
                .map((link) => (
                  <article key={link.id}>
                    <div>
                      <strong>{link.other?.name || link.other?.email}</strong>
                      <small>
                        {link.status === "pending"
                          ? "ממתין לאישור"
                          : "שיתוף פעיל"}
                      </small>
                    </div>
                    {link.direction === "incoming" &&
                      link.status === "pending" && (
                        <button
                          onClick={() => updatePartnership(link.id, "accept")}
                        >
                          אשר
                        </button>
                      )}
                    {link.direction === "incoming" && link.status === "pending" && <button className="reject" onClick={() => updatePartnership(link.id, "reject")}>דחה</button>}
                    <button
                      onClick={() => updatePartnership(link.id, "revoke")}
                    >
                      בטל
                    </button>
                  </article>
                ))}
            </div>
            {(state.sharedProfiles || []).map((shared) => (
              <section className="shared-summary" key={shared.linkId}>
                <header>
                  <strong>{shared.user?.name}</strong>
                  <small>סיכום משותף</small>
                </header>
                {shared.today && (
                  <div>
                    <span>
                      קלוריות היום{" "}
                      <b>
                        {shared.today.meals.reduce(
                          (sum: number, meal: any) =>
                            sum + Number(meal.kcal || 0),
                          0,
                        )}
                      </b>
                    </span>
                    <span>
                      מים <b>{shared.today.waterMl} מ״ל</b>
                    </span>
                    <span>
                      ארוחות <b>{shared.today.meals.filter((meal: any) => !meal.beverageEntry).length}</b>
                    </span>
                  </div>
                )}
                {shared.profile && (
                  <p>משקל יעד: {shared.profile.targetWeight} ק״ג</p>
                )}
              </section>
            ))}
          </section>
        </div>
      )}
      {pendingQuickFood && (
        <div className="modal-layer">
          <button
            className="backdrop"
            onClick={() => setPendingQuickFood(null)}
          />
          <section className="settings-modal quick-confirm">
            <header>
              <div>
                <p className="eyebrow">הוספה לארוחה</p>
                <h2>להוסיף {pendingQuickFood.name}?</h2>
              </div>
              <button onClick={() => setPendingQuickFood(null)}>×</button>
            </header>
            <div className="quick-confirm-food">
              {pendingQuickFood.image ? <img src={pendingQuickFood.image} alt="" /> : <span>{pendingQuickFood.icon || "▦"}</span>}
              <div>
                <strong>{pendingQuickFood.portion}</strong>
                <small>{pendingQuickFood.basis === "100g" ? `${Math.round(Number(pendingQuickFood.kcal || 0) * quickFoodWeight / 100)} קלוריות לפי ${quickFoodWeight} גרם` : `${pendingQuickFood.kcal} קלוריות`}</small>
              </div>
            </div>
            {pendingQuickFood.basis === "100g" && <label className="quick-weight-field">משקל שאכלתי (גרם)<input type="number" min="1" max="3000" step="1" value={quickFoodWeight} onChange={(event) => setQuickFoodWeight(Math.max(1, Number(event.target.value) || 1))} /><small>הערכים יחושבו אוטומטית לפי נתוני המוצר ל־100 גרם.</small></label>}
            <label>
              סוג הארוחה
              <select
                value={mealPeriod}
                onChange={(e) => setMealPeriod(e.target.value)}
              >
                <option value="breakfast">ארוחת בוקר</option>
                <option value="lunch">ארוחת צהריים</option>
                <option value="dinner">ארוחת ערב</option>
                <option value="snack">בין הארוחות</option>
              </select>
            </label>
            <footer>
              <button onClick={() => setPendingQuickFood(null)}>ביטול</button>
              <button className="primary" onClick={confirmQuickFood}>
                המשך לסיכום
              </button>
            </footer>
          </section>
        </div>
      )}
      {barcodeScannerOpen && <div className="modal-layer barcode-scanner-layer"><button className="backdrop" onClick={() => setBarcodeScannerOpen(false)} /><section className="barcode-scanner"><header><div><strong>סריקת ברקוד</strong><small>המצלמה מנתחת וידאו מקומית בלבד</small></div><button type="button" onClick={() => setBarcodeScannerOpen(false)} aria-label="סגירה">×</button></header><div className="barcode-video-frame"><video ref={barcodeVideo} playsInline muted /><i /><span>מקם את הברקוד בתוך המסגרת</span></div><p>{barcodeStatus}</p><button type="button" onClick={() => setBarcodeScannerOpen(false)}>ביטול וחזרה להזנה ידנית</button></section></div>}
      {customFoodOpen && (
        <div className="modal-layer">
          <button
            className="backdrop"
            onClick={() => !busy && setCustomFoodOpen(false)}
          />
          <section className="settings-modal custom-food-modal">
            <header>
              <div>
                <p className="eyebrow">
                  {quickCategory === "fruits"
                    ? "פירות"
                    : quickCategory === "vegetables"
                      ? "ירקות"
                      : "משקאות"}
                </p>
                <h2>
                  הוסף{" "}
                  {quickCategory === "fruits"
                    ? "פרי"
                    : quickCategory === "vegetables"
                      ? "ירק"
                      : "משקה"}
                </h2>
              </div>
              <button disabled={busy} onClick={() => setCustomFoodOpen(false)}>
                ×
              </button>
            </header>
            {!customFoodDraft ? (
              <div className="custom-food-create">
                <label>
                  שם
                  <input
                    value={customFoodName}
                    onChange={(e) => setCustomFoodName(e.target.value)}
                    placeholder={
                      quickCategory === "fruits"
                        ? "למשל: מנגו"
                        : quickCategory === "vegetables"
                          ? "למשל: קישוא"
                          : "למשל: קפוצ׳ינו"
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        createCustomFoodDraft();
                      }
                    }}
                  />
                </label>
                <button
                  className="primary"
                  onClick={createCustomFoodDraft}
                  disabled={busy || customFoodName.trim().length < 2}
                >
                  {busy ? "יוצר…" : "צור תמונה וחשב קלוריות"}
                </button>
              </div>
            ) : (
              <div className="custom-food-preview">
                <img src={customFoodDraft.image} alt={customFoodDraft.name} />
                <div>
                  <strong>{customFoodDraft.name}</strong>
                  <span>{customFoodDraft.portion}</span>
                  <b>{customFoodDraft.kcal} kcal</b>
                  <small>
                    חלבון {customFoodDraft.protein}g · פחמימות{" "}
                    {customFoodDraft.carbs}g · שומן {customFoodDraft.fat}g
                  </small>
                </div>
              </div>
            )}
            {customFoodStatus && (
              <p className="photo-status">{customFoodStatus}</p>
            )}
            <footer>
              <button onClick={() => setCustomFoodOpen(false)} disabled={busy}>
                ביטול
              </button>
              {customFoodDraft && (
                <>
                  <button
                    onClick={() => {
                      setCustomFoodDraft(null);
                      setCustomFoodStatus("");
                    }}
                  >
                    צור מחדש
                  </button>
                  <button
                    className="primary"
                    onClick={saveCustomFood}
                    disabled={busy}
                  >
                    {busy ? "שומר…" : "שמור בגלריה"}
                  </button>
                </>
              )}
            </footer>
          </section>
        </div>
      )}
      {waterOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setWaterOpen(false)} />
          <section className="settings-modal compact-modal beverage-manager-modal">
            <header>
              <div>
                <h2>הוספת משקה</h2>
                <small>בחר אילו משקאות יוצגו במרכז השתייה</small>
              </div>
              <button onClick={() => setWaterOpen(false)}>×</button>
            </header>
            <label className="water-target-field">יעד שתייה יומי<select value={waterTargetValue} onChange={(event) => setWaterTargetValue(Number(event.target.value))}>{[1500,1750,2000,2250,2500,2750].map((amount) => <option key={amount} value={amount}>{(amount / 1000).toLocaleString("he-IL")} ליטר</option>)}</select><small>היעד משקף את כלל הנוזלים שתרמו המשקאות שנבחרו.</small></label>
            <div className="beverage-picker"><strong>אפשרויות משקה</strong><small>הבחירה מוסיפה בר ריק בלבד. צריכה תירשם רק בלחיצה על +.</small><div>{[...HYDRATION_BEVERAGES.filter((item) => !item.fixed && !item.legacy), ...customHydrationBeverages].map((beverage) => <label key={beverage.id} className={selectedHydrationBeverages.includes(beverage.id) ? "selected" : ""}><input type="checkbox" checked={selectedHydrationBeverages.includes(beverage.id)} onChange={(event) => setSelectedHydrationBeverages((current) => event.target.checked ? [...new Set([...current, beverage.id])] : current.filter((id) => id !== beverage.id))} /><span>{beverage.icon}</span><b>{beverage.name}</b><small>{beverage.defaultAmount} מ״ל · {beverage.kcalPer100} קל׳ ל־100 מ״ל</small></label>)}</div></div>
            {!customBeverageOpen ? <button type="button" className="add-custom-beverage" onClick={() => setCustomBeverageOpen(true)}>＋ הוספה מותאמת</button> : <div className="custom-beverage-form"><header><strong>משקה מותאם</strong><button type="button" onClick={() => setCustomBeverageOpen(false)}>×</button></header><label>שם המשקה<input value={customBeverageDraft.name} onChange={(event) => setCustomBeverageDraft({ ...customBeverageDraft, name: event.target.value })} placeholder="למשל: לימונדה ביתית" /></label><div><label>כמות לכוס (מ״ל)<input type="number" min="50" max="1000" step="50" value={customBeverageDraft.defaultAmount} onChange={(event) => setCustomBeverageDraft({ ...customBeverageDraft, defaultAmount: Number(event.target.value) })} /></label><label>קלוריות ל־100 מ״ל<input type="number" min="0" max="900" value={customBeverageDraft.kcalPer100} onChange={(event) => setCustomBeverageDraft({ ...customBeverageDraft, kcalPer100: Number(event.target.value) })} /></label></div><details><summary>ערכים נוספים</summary><div>{[["proteinPer100","חלבון"],["carbsPer100","פחמימות"],["fatPer100","שומן"]].map(([key,label]) => <label key={key}>{label} ל־100 מ״ל<input type="number" min="0" max="100" step="0.1" value={(customBeverageDraft as any)[key]} onChange={(event) => setCustomBeverageDraft({ ...customBeverageDraft, [key]: Number(event.target.value) })} /></label>)}</div></details><button type="button" className="primary" onClick={addCustomBeverage}>הוסף לרשימה</button></div>}
            <footer>
              <button onClick={() => setWaterOpen(false)}>ביטול</button>
              <button className="primary" onClick={saveWater} disabled={busy}>
                שמור והצג במרכז השתייה
              </button>
            </footer>
          </section>
        </div>
      )}
      {mealOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setMealOpen(false)} />
          <form className={`settings-modal meal-modal${editingMealId ? " is-editing" : ""}`} onSubmit={addMeal}>
            <header>
              <div>
                <p className="eyebrow">יומן יומי</p>
                <h2>{editingMealId ? "עריכת ארוחה" : "הוספת ארוחה"}</h2>
              </div>
              <button type="button" onClick={() => setMealOpen(false)}>
                ×
              </button>
            </header>
            {mealSaveFeedback && (
              <div className={`meal-save-feedback ${Object.keys(mealValidationErrors).length ? "needs-input" : "saving"}`} role="status" aria-live="assertive">
                <strong>{Object.keys(mealValidationErrors).length ? "נדרשת השלמה לפני השמירה" : mealReviewReady ? "סיכום לפני אישור" : "מצב החישוב"}</strong>
                <span>{mealSaveFeedback}</span>
              </div>
            )}
            {manualAiMode && mealItems.length === 0 && (
              <section className="manual-ai-entry">
                <label>
                  {catalogOnly
                    ? `איזה ${foodCategory === "fruits" ? "פרי" : foodCategory === "vegetables" ? "ירק" : "משקה"} להוסיף?`
                    : "מה אכלת?"}
                  <textarea
                    rows={catalogOnly ? 2 : 3}
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    placeholder={
                      catalogOnly
                        ? "רשום שם ותיאור קצר, למשל: מנגו בינוני"
                        : "למשל: שתי חתיכות פרגית, כוס אורז וסלט קטן"
                    }
                  />
                </label>
                <div className="manual-ai-actions">
                  <button type="button" className="dictation-action" onClick={dictateManualDescription}><AppIcon name="mic" /> הכתבה</button>
                  <div className="manual-value-actions">
                    <button type="button" className="calculate-values-action" onClick={analyzeManualDescription} disabled={busy || !manualDescription.trim()}><AppIcon name="calculator" />{busy ? "מחשב…" : catalogOnly ? "צור תמונה וחשב ערכים" : "חשב ערכים"}</button>
                    {!catalogOnly && <button type="button" className="own-values-action" onClick={() => setManualAiMode(false)}><AppIcon name="list" /> יש לי ערכים</button>}
                  </div>
                </div>
                <small>
                  {catalogOnly
                    ? "לאחר החישוב אפשר לבדוק ולתקן את הערכים לפני שמירה בגלריה."
                    : "לאחר החישוב יוצגו כל הפריטים, הכמויות וההנחות לעריכה ולאישור."}
                </small>
              </section>
            )}
            {(!manualAiMode || mealItems.length > 0) && <>
            {mealSource === "photo" ? <section className={`photo-review-hero ${photoQuality?.level === "warning" ? "retry" : ""} ${busy && !mealReviewReady ? "analyzing" : ""} ${mealReviewReady && photoQuality?.level !== "warning" ? "ready" : ""}`}>
              {photoPreview ? <img src={photoPreview} alt="התמונה שצולמה" /> : <div className="photo-placeholder"><AppIcon name="camera" /></div>}
              {photoQuality?.level === "warning" ? <div className="photo-retry-message"><strong>צריך צילום ברור יותר</strong><p>{photoStatus}</p><button type="button" onClick={openInAppCamera}><AppIcon name="camera" /> צלם שוב</button></div> : busy && !mealReviewReady ? <div className="photo-analyzing" role="status"><span className="scan-spark"><AppIcon name="sparkles" /></span><strong>מזהה מה יש בתמונה</strong><p>{photoStatus}</p><i><b /></i></div> : <div className="photo-detection"><small>זוהה בתמונה</small><h3>{mealForm.name || "הארוחה שלך"}</h3>{mealReviewReady && <strong className="detected-calories">{Math.round(Number(mealDraftPreview.kcal || 0))} <small>קלוריות</small></strong>}</div>}
            </section> : <section className="meal-review-intro">
              <span className={`meal-source-icon ${mealSource}`}><AppIcon name={mealSource === "voice" ? "mic" : "plus"} /></span>
              <div><small>{mealSource === "voice" ? "זוהה מהכתבה" : "הוספה ידנית"}</small><strong>{busy ? "מכין את התוצאה…" : mealReviewReady ? "מוכן לבדיקה ולאישור" : "ממתין לפרטים"}</strong>{photoStatus && <p className="photo-status">{photoStatus}</p>}</div>
            </section>}
            {mealReviewReady && photoQuality?.level !== "warning" && (mealForm.name || mealItems.length > 0) && <section className="unified-meal-result">
              {photoPreview && <img className="unified-meal-image" src={photoPreview} alt={mealForm.name || "הארוחה שזוהתה"} />}
              <header><div><small>הארוחה שלך</small><h3>{mealForm.name || "ארוחה חדשה"}</h3></div><strong>{Math.round(Number(mealDraftPreview.kcal || 0)).toLocaleString()}<small> קלוריות</small></strong><button type="button" className={`meal-favorite-star ${draftAlreadyFavorite ? "selected" : ""}`} onClick={toggleDraftFavorite} aria-pressed={draftAlreadyFavorite} aria-label={draftAlreadyFavorite ? "הסרה מהמועדפים" : "שמירה מיידית במועדפים"} title={draftAlreadyFavorite ? "נשמר במועדפים" : "שמירה מיידית במועדפים"}><AppIcon name="star" /></button>{favoriteStatus && <small className="meal-favorite-status" role="status">{favoriteStatus}</small>}</header>
              <div className="meal-result-rings">
                {[
                  { key: "recognition", label: ["photo", "voice"].includes(mealSource) ? "ציון זיהוי" : "אמינות חישוב", value: ["photo", "voice"].includes(mealSource) ? mealRecognitionScore : mealReliabilityPreview.score, amount: `${["photo", "voice"].includes(mealSource) ? mealRecognitionScore : mealReliabilityPreview.score}/100` },
                  { key: "protein", label: "חלבון", value: Math.min(100, Math.round(Number(mealDraftPreview.protein || 0) / Math.max(1, Number(profile.protein || 0) - macros.protein) * 100)), amount: `${Math.round(Number(mealDraftPreview.protein || 0))} מתוך ${Math.max(0, Math.round(Number(profile.protein || 0) - macros.protein))} גרם` },
                  { key: "carbs", label: "פחמימות", value: Math.min(100, Math.round(Number(mealDraftPreview.carbs || 0) / Math.max(1, Number(profile.carbs || 0) - macros.carbs) * 100)), amount: `${Math.round(Number(mealDraftPreview.carbs || 0))} מתוך ${Math.max(0, Math.round(Number(profile.carbs || 0) - macros.carbs))} גרם` },
                  { key: "fat", label: "שומן", value: Math.min(100, Math.round(Number(mealDraftPreview.fat || 0) / Math.max(1, Number(profile.fat || 0) - macros.fat) * 100)), amount: `${Math.round(Number(mealDraftPreview.fat || 0))} מתוך ${Math.max(0, Math.round(Number(profile.fat || 0) - macros.fat))} גרם` },
                ].map((ring) => <span className={`meal-result-ring ${ring.key}`} key={ring.key} style={{ "--ring-value": ring.value } as CSSProperties}><i><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" pathLength="100" /><circle cx="22" cy="22" r="18" pathLength="100" /></svg><b>{ring.value}%</b></i><strong>{ring.label}</strong><small>{ring.amount}</small></span>)}
              </div>
              <p className="meal-calculation-note">התוצאה חושבה מחיבור {Math.max(1, mealItems.length)} {mealItems.length === 1 ? "רכיב" : "רכיבים"} לפי הכמות והמשקל. כיסוי המקורות התזונתיים הוא {mealReliabilityPreview.coverage}%. {estimatedCalorieRange ? `בלי קנה מידה בתמונה, המשקל משוער והטווח הסביר הוא ${estimatedCalorieRange.low.toLocaleString()}–${estimatedCalorieRange.high.toLocaleString()} קלוריות.` : "הצילום כולל קנה מידה שהוגדר בכיול."}</p>
              <div className="meal-result-actions"><button type="button" onClick={() => { setMealDetailsOpen(true); window.requestAnimationFrame(() => document.querySelector(".meal-details")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}><AppIcon name="edit" /> עריכה</button><button type="button" onClick={recalculateMealWithAi} disabled={busy}><AppIcon name="sparkles" /> {busy ? "מחשב…" : "חשב מחדש"}</button></div>
            </section>}
            {!busy && photoQuality?.level !== "warning" && <details className="meal-details" open={mealDetailsOpen || !mealItems.length} onToggle={(event) => setMealDetailsOpen(event.currentTarget.open)}>
              <summary><span><strong>יש טעות? ערוך</strong><small>שם, כמות, משקל או ערכים</small></span><b>⌄</b></summary>
            <div className="settings-grid">
              <label className="wide">
                שם הארוחה
                <input
                  data-meal-field="name"
                  className={mealValidationErrors.name ? "field-error" : ""}
                  aria-invalid={Boolean(mealValidationErrors.name)}
                  value={mealForm.name}
                  onChange={(e) =>
                    setMealForm({ ...mealForm, name: e.target.value })
                  }
                  placeholder="למשל: יוגורט, גרנולה ופירות"
                />
              </label>
              {mealSource === "manual" && mealItems.length === 0 && <label className="wide">כמות / משקל<input value={manualPortion} onChange={(event) => setManualPortion(event.target.value)} placeholder="למשל: 150 גרם, כוס אחת או 2 יחידות" /></label>}
              <label className="wide">
                סוג הארוחה
                <select
                  value={mealPeriod}
                  onChange={(e) => setMealPeriod(e.target.value)}
                >
                  <option value="breakfast">ארוחת בוקר</option>
                  <option value="lunch">ארוחת צהריים</option>
                  <option value="dinner">ארוחת ערב</option>
                  <option value="snack">בין הארוחות</option>
                </select>
              </label>
              {!catalogOnly && (
                <label className="wide">
                  מתי אכלתי?
                  <input
                    type="datetime-local"
                    value={mealDateTime}
                    max={(() => {
                      const date = new Date();
                      date.setMinutes(
                        date.getMinutes() - date.getTimezoneOffset(),
                      );
                      return date.toISOString().slice(0, 16);
                    })()}
                    onChange={(e) => setMealDateTime(e.target.value)}
                  />
                  <small>
                    אפשר לבחור שעה או יום קודמים; הארוחה תמוקם אוטומטית במקום
                    הנכון בהיסטוריה.
                  </small>
                </label>
              )}
              {mealItems.length > 0 ? (
                <div className="meal-items-editor wide">
                  <div className="meal-items-heading">
                    <div>
                      <strong>רכיבי הארוחה</strong>
                      <small>המשקל הוא לפריט אחד; הכמות מכפילה אותו.</small>
                    </div>
                    <button type="button" onClick={addCustomMealItem}>
                      ＋ שדה מותאם
                    </button>
                  </div>
                  {mealItems.map((item, index) => (
                    <article key={index}>
                      <input
                        data-meal-field={`item-name-${index}`}
                        className="item-name"
                        aria-invalid={Boolean(mealValidationErrors[`item-name-${index}`])}
                        value={item.name}
                        onChange={(e) =>
                          updateMealItem(index, "name", e.target.value)
                        }
                        placeholder="שם הפריט"
                        aria-label={`שם פריט ${index + 1}`}
                      />
                      <label>
                        משקל בגרם
                        <div className="number-stepper"><button type="button" onClick={() => adjustMealItem(index, "grams", -10, 1)}>−</button><input
                          data-meal-field={`item-grams-${index}`}
                          className={mealValidationErrors[`item-grams-${index}`] ? "field-error" : ""}
                          aria-invalid={Boolean(mealValidationErrors[`item-grams-${index}`])}
                          type="number"
                          min="1"
                          max="3000"
                          value={item.grams || ""}
                          onChange={(e) =>
                            updateMealItem(
                              index,
                              "grams",
                              Number(e.target.value),
                            )
                          }
                        /><button type="button" onClick={() => adjustMealItem(index, "grams", 10, 1)}>＋</button></div>
                      </label>
                      <label>
                        כמות
                        <div className="number-stepper"><button type="button" onClick={() => adjustMealItem(index, "quantity", -1, 1, 50)}>−</button><input
                          data-meal-field={`item-kcal-${index}`}
                          className={mealValidationErrors[`item-kcal-${index}`] ? "field-error" : ""}
                          aria-invalid={Boolean(mealValidationErrors[`item-kcal-${index}`])}
                          type="number"
                          min="0.1"
                          max="50"
                          step="0.1"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateMealItem(
                              index,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                        /><button type="button" onClick={() => adjustMealItem(index, "quantity", 1, 1, 50)}>＋</button></div>
                      </label>
                      <label>
                        {Number(item.kcalPerUnit) > 0 ? "קלוריות ליחידה" : "קלוריות ל־100 גרם"}
                        <div className="number-stepper"><button type="button" onClick={() => adjustMealItem(index, Number(item.kcalPerUnit) > 0 ? "kcalPerUnit" : "kcalPer100", -10, 0, 1000)}>−</button><input
                          type="number"
                          min="0"
                          max="1000"
                          value={Number(item.kcalPerUnit) > 0 ? item.kcalPerUnit : item.kcalPer100 || ""}
                          onChange={(e) =>
                            updateMealItem(
                              index,
                              Number(item.kcalPerUnit) > 0 ? "kcalPerUnit" : "kcalPer100",
                              Number(e.target.value),
                            )
                          }
                        /><button type="button" onClick={() => adjustMealItem(index, Number(item.kcalPerUnit) > 0 ? "kcalPerUnit" : "kcalPer100", 10, 0, 1000)}>＋</button></div>
                        <small>{Number(item.kcalPerUnit) > 0 ? `${item.quantity || 1} × ${item.kcalPerUnit} = ` : ""}{Math.round(Number(item.kcalPerUnit) > 0 ? Number(item.kcalPerUnit) * Number(item.quantity || 1) : Number(item.kcalPer100 || 0) * Number(item.grams || 0) * Number(item.quantity || 1) / 100)} קלוריות לכמות שנבחרה</small>
                      </label>
                      <button
                        className="remove-item"
                        type="button"
                        onClick={() =>
                          setMealItems((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        aria-label={`הסרת ${item.name || "פריט"}`}
                      >
                        ×
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <label>
                    קלוריות
                    <div className="number-stepper"><button type="button" onClick={() => adjustMealForm("kcal", -10)}>−</button><input
                      data-meal-field="kcal"
                      className={mealValidationErrors.kcal ? "field-error" : ""}
                      aria-invalid={Boolean(mealValidationErrors.kcal)}
                      type="number"
                      min="1"
                      value={mealForm.kcal || ""}
                      onChange={(e) =>
                        setMealForm({
                          ...mealForm,
                          kcal: Number(e.target.value),
                        })
                      }
                    /><button type="button" onClick={() => adjustMealForm("kcal", 10)}>＋</button></div>
                  </label>
                  <label>
                    חלבון (גרם)
                    <div className="number-stepper"><button type="button" onClick={() => adjustMealForm("protein", -1)}>−</button><input
                      type="number"
                      min="0"
                      value={mealForm.protein || ""}
                      onChange={(e) =>
                        setMealForm({
                          ...mealForm,
                          protein: Number(e.target.value),
                        })
                      }
                    /><button type="button" onClick={() => adjustMealForm("protein", 1)}>＋</button></div>
                  </label>
                  <label>
                    פחמימות (גרם)
                    <div className="number-stepper"><button type="button" onClick={() => adjustMealForm("carbs", -1)}>−</button><input
                      type="number"
                      min="0"
                      value={mealForm.carbs || ""}
                      onChange={(e) =>
                        setMealForm({
                          ...mealForm,
                          carbs: Number(e.target.value),
                        })
                      }
                    /><button type="button" onClick={() => adjustMealForm("carbs", 1)}>＋</button></div>
                  </label>
                  <label>
                    שומן (גרם)
                    <div className="number-stepper"><button type="button" onClick={() => adjustMealForm("fat", -1)}>−</button><input
                      type="number"
                      min="0"
                      value={mealForm.fat || ""}
                      onChange={(e) =>
                        setMealForm({
                          ...mealForm,
                          fat: Number(e.target.value),
                        })
                      }
                    /><button type="button" onClick={() => adjustMealForm("fat", 1)}>＋</button></div>
                  </label>
                  <button
                    className="add-components wide"
                    type="button"
                    onClick={addCustomMealItem}
                  >
                    ＋ חשב ארוחה ידנית לפי רכיבים ומשקל
                  </button>
                </>
              )}
            </div></details>}
            {(mealForm.name || mealItems.length > 0) && <details className={`meal-reliability ${mealReliabilityPreview.level}`} open={mealReliabilityPreview.level === "low"}>
              <summary><span><AppIcon name={mealReliabilityPreview.level === "high" ? "target" : "info"} /><b>{mealReliabilityPreview.label}</b><small>{mealReliabilityPreview.score}/100 · כיסוי {mealReliabilityPreview.coverage}%</small></span><i aria-hidden="true" /></summary>
              {mealReliabilityPreview.items.length > 0 && <div>{mealReliabilityPreview.items.map((item: any, index: number) => <article key={`${item.name}-${index}`}><header><strong>{item.name}</strong><b>{item.score}/100</b></header><p>{item.source}</p><small>{item.formula}</small></article>)}</div>}
              {mealReliabilityPreview.issues.length > 0 && <ul>{mealReliabilityPreview.issues.map((issue: any, index: number) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul>}
            </details>}
            {mealItems.length > 0 && (
              <section className="ai-correction-box">
                <div><strong>צריך לתקן את הזיהוי?</strong><small>כתוב רק מה לא נכון — ה־AI יעדכן את הטיוטה בלי לשמור אותה.</small></div>
                <div>
                  <input value={aiCorrection} onChange={(event) => setAiCorrection(event.target.value)} placeholder="למשל: זה קפה עם מעט חלב וללא סוכר" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void correctMealWithAi(); } }} />
                  <button type="button" onClick={correctMealWithAi} disabled={busy || !aiCorrection.trim()}>{busy ? "מתקן…" : "תקן עם AI"}</button>
                </div>
                {aiCorrectionStatus && <p role="status">{aiCorrectionStatus}</p>}
              </section>
            )}
            <section className="library-options">
              <label>
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                />{" "}
                הוסף גם לקטלוג האישי שלי
              </label>
              {saveToLibrary && (
                <div>
                  <label>
                    סוג
                    <select
                      value={foodCategory}
                      onChange={(e) => setFoodCategory(e.target.value)}
                    >
                      <option value="meals">ארוחות</option>
                      <option value="vegetables">ירקות</option>
                      <option value="fruits">פירות</option>
                      <option value="drinks">משקאות</option>
                    </select>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="food-visibility"
                      checked={foodVisibility === "private"}
                      onChange={() => setFoodVisibility("private")}
                    />{" "}
                    פרטי — רק אני
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="food-visibility"
                      checked={foodVisibility === "shared"}
                      onChange={() => setFoodVisibility("shared")}
                    />{" "}
                    משותף — כל המשתמשים
                  </label>
                  <button
                    type="button"
                    onClick={() => foodImageInput.current?.click()}
                  >
                    ▧ טען תמונה
                  </button>
                  <input
                    ref={foodImageInput}
                    className="camera-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={loadFoodImage}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={generateFoodArtwork}
                      onChange={(e) => setGenerateFoodArtwork(e.target.checked)}
                    />{" "}
                    אם אין תמונה מתאימה, צור באמצעות AI
                  </label>
                </div>
              )}
            </section>
            </>}
            <footer>
              {editingMealId && <button className="danger" type="button" onClick={async () => { await deleteMeal(editingMealId); setEditingMealId(""); setMealOpen(false); }}>מחק ארוחה</button>}
              <button type="button" onClick={() => setMealOpen(false)}>
                ביטול
              </button>
              {photoQuality?.level === "warning" ? <button type="button" className="primary" onClick={openInAppCamera}><AppIcon name="camera" /> צילום חוזר</button> : <button
                type="submit"
                className="primary"
                disabled={busy || (manualAiMode && mealItems.length === 0)}
              >
                {busy
                  ? "שומר…"
                  : editingMealId
                  ? "שמור שינויים וסגור"
                  : catalogOnly
                  ? "שמור בגלריה"
                  : "אישור והוספה ליומן"}
              </button>}
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}

function Login({
  values,
  setValues,
  submit,
  busy,
  error,
  adminConfigured,
  adminPassword,
  setAdminPassword,
  setupAdmin,
}: any) {
  return (
    <main className="onboarding-shell" dir="rtl">
      <header>
        <img src="/caloreazi-wordmark-transparent.png" alt="CALOREAZI" />
      </header>
      <section className="onboarding-card login-card">
        <p className="eyebrow">ברוך הבא</p>
        <h1>{adminConfigured ? "כניסה לחשבון" : "הגדרת ADMIN"}</h1>
        <p>
          {adminConfigured
            ? "הנתונים והיעדים שלך זמינים רק לאחר התחברות."
            : "התקנה חדשה: הגדר סיסמת מנהל כדי להמשיך."}
        </p>
        {adminConfigured ? (
          <form onSubmit={submit}>
            <div className="field-stack">
              <label>
                אימייל או שם משתמש
                <input
                  type="text"
                  value={values.login}
                  onChange={(e) =>
                    setValues({ ...values, login: e.target.value })
                  }
                  autoComplete="username"
                />
              </label>
              <label>
                סיסמה
                <input
                  type="password"
                  value={values.password}
                  onChange={(e) =>
                    setValues({ ...values, password: e.target.value })
                  }
                  autoComplete="current-password"
                />
              </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <footer>
              <button
                className="primary"
                disabled={busy || !values.login || !values.password}
              >
                {busy ? "מתחבר…" : "כניסה"}
              </button>
            </footer>
          </form>
        ) : (
          <form onSubmit={setupAdmin}>
            <div className="field-stack">
              <label>
                סיסמת Admin חדשה
                <input
                  type="password"
                  minLength={10}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <footer>
              <button
                className="primary"
                disabled={busy || adminPassword.length < 10}
              >
                צור ADMIN
              </button>
            </footer>
          </form>
        )}
      </section>
      <p className="medical-note">יצירת משתמש חדש מתבצעת על ידי מנהל המערכת.</p>
    </main>
  );
}

function Onboarding({
  step,
  setStep,
  values,
  setValues,
  finish,
  busy,
  error,
  bootstrap,
}: any) {
  const screens = [
    <>
      <p className="eyebrow">ברוך הבא</p>
      <h1>בוא נכין את המסלול שלך</h1>
      <p>כמה שאלות קצרות. אפשר לשנות הכול אחר כך.</p>
      <div className="field-stack">
        <label>
          איך לפנות אליך?
          <input
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            placeholder="שם פרטי"
          />
        </label>
        <label>
          אימייל <small>לא חובה כרגע</small>
          <input
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
        </label>
        {bootstrap && (
          <label>
            סיסמת Admin <small>לפחות 10 תווים</small>
            <input
              type="password"
              minLength={10}
              value={values.adminPassword}
              onChange={(e) =>
                setValues({ ...values, adminPassword: e.target.value })
              }
              autoComplete="new-password"
            />
          </label>
        )}
      </div>
    </>,
    <>
      <p className="eyebrow">המטרה שלך</p>
      <h1>מה היית רוצה להשיג?</h1>
      <div className="choice-grid">
        {Object.entries(goalLabels).map(([key, label]) => (
          <button
            className={values.goal === key ? "selected" : ""}
            onClick={() => setValues({ ...values, goal: key })}
            key={key}
          >
            {label}
          </button>
        ))}
      </div>
    </>,
    <>
      <p className="eyebrow">נקודת הכניסה שלך</p>
      <h1>איפה אתה נמצא בתהליך?</h1>
      <p>השאלות משתנות לפי הבחירה. אפשר להשאיר כל פרט שאינך יודע ריק.</p>
      <div className="journey-stage-grid onboarding-journey-stages">{Object.entries(journeyStageLabels).map(([key,label]) => <button type="button" key={key} className={values.journeyStage === key ? "selected" : ""} onClick={() => setValues({ ...values, journeyStage: key })}>{label}</button>)}</div>
      {values.journeyStage !== "starting" && <div className="journey-existing-details onboarding-existing-details"><div className="metrics-grid"><label>כמה שבועות אתה כבר בתהליך?<input type="number" min="0" max="520" value={values.journeyWeeks} onChange={(e) => setValues({ ...values, journeyWeeks: Number(e.target.value) })} /></label><label>משקל בתחילת התהליך<input type="number" min="25" max="350" step=".1" value={values.journeyStartingWeight || ""} onChange={(e) => setValues({ ...values, journeyStartingWeight: Number(e.target.value) })} /></label><label>שינוי משוער ב־4 השבועות האחרונים<input type="number" min="-20" max="20" step=".1" value={values.journeyRecentChangeKg || ""} onChange={(e) => setValues({ ...values, journeyRecentChangeKg: Number(e.target.value) })} /><small>בק״ג: מינוס לירידה, פלוס לעלייה</small></label><label>יעד קלורי קודם — אם היה<input type="number" min="800" max="6000" value={values.previousCalorieTarget || ""} onChange={(e) => setValues({ ...values, previousCalorieTarget: Number(e.target.value) })} /></label>{values.journeyStage === "plateau" && <label>כמה שבועות קיימת תקיעות?<input type="number" min="1" max="52" value={values.plateauWeeks || ""} onChange={(e) => setValues({ ...values, plateauWeeks: Number(e.target.value) })} /></label>}<label>מה ניסית עד עכשיו?<select value={values.priorApproach} onChange={(e) => setValues({ ...values, priorApproach: e.target.value })}><option value="">לא בחרתי</option><option value="calorie_tracking">ספירת קלוריות</option><option value="meal_plan">תפריט קבוע</option><option value="intuitive">אכילה אינטואיטיבית</option><option value="low_carb">הפחתת פחמימות</option><option value="other">שיטה אחרת</option></select></label><label className="wide">מה הקושי המרכזי כרגע?<textarea value={values.mainChallenge} maxLength={300} onChange={(e) => setValues({ ...values, mainChallenge: e.target.value })} /></label></div><small>הדיווח עוזר למאמן להבין את הרקע. התאמות מספריות יחכו לנתונים שייאספו באפליקציה.</small></div>}
    </>,
    <>
      <p className="eyebrow">נקודת פתיחה</p>
      <h1>כמה פרטים לחישוב ראשוני</h1>
      <div className="metrics-grid">
        <label>
          מין ביולוגי
          <select
            value={values.sex}
            onChange={(e) => setValues({ ...values, sex: e.target.value })}
          >
            <option value="male">זכר</option>
            <option value="female">נקבה</option>
          </select>
        </label>
        <label>
          תאריך לידה
          <input type="date" value={values.birthDate} onChange={(e) => setValues({ ...values, birthDate: e.target.value })} />
          <small>{exactAge(values.birthDate) !== null ? `הגיל שלך: ${exactAge(values.birthDate)} שנים` : "הגיל מחושב אוטומטית לצורך יעדים מדויקים."}</small>
        </label>
        <label>
          גובה (ס״מ)
          <input
            type="number"
            value={values.height}
            onChange={(e) => setValues({ ...values, height: e.target.value })}
          />
        </label>
        <label>
          משקל (ק״ג)
          <input
            type="number"
            value={values.weight}
            onChange={(e) => setValues({ ...values, weight: e.target.value })}
          />
        </label>
        <label>
          משקל יעד
          <input
            type="number"
            value={values.targetWeight}
            onChange={(e) =>
              setValues({ ...values, targetWeight: e.target.value })
            }
          />
        </label>
        <div className="onboarding-theme-choice">
          <strong>צבע הממשק</strong>
          <div>
            <button type="button" className={values.theme === "dark" ? "selected dark-choice" : "dark-choice"} onClick={() => setValues({ ...values, theme: "dark" })}><i />כהה</button>
            <button type="button" className={values.theme === "light" ? "selected light-choice" : "light-choice"} onClick={() => setValues({ ...values, theme: "light" })}><i />בהיר</button>
          </div>
        </div>
        <label>שפת הממשק<select value={values.language || "he"} onChange={(e) => setValues({ ...values, language: e.target.value })}><option value="he">עברית</option><option value="en">English (beta)</option></select></label>
      </div>
    </>,
    <>
      <p className="eyebrow">הקצב שלך</p>
      <h1>כמה אתה בתנועה?</h1>
      <div className="choice-grid">
        {[
          ["low", "רוב היום בישיבה"],
          ["light", "קצת בתנועה"],
          ["active", "פעיל"],
          ["very", "מאוד פעיל"],
        ].map(([key, label]) => (
          <button
            className={values.activity === key ? "selected" : ""}
            onClick={() => setValues({ ...values, activity: key })}
            key={key}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="field-stack">
        <label>ניסיון באימוני כוח<select value={values.trainingExperience} onChange={(e) => setValues({ ...values, trainingExperience: e.target.value })}><option value="beginner">מתחיל/ה</option><option value="intermediate">ביניים</option><option value="advanced">מתקדם/ת</option><option value="none">לא מבצע/ת אימוני כוח</option></select></label>
        <label>קצב מסלול מועדף<select value={values.preferredPace} onChange={(e) => setValues({ ...values, preferredPace: e.target.value })}><option value="gentle">רגוע — פחות שינויים</option><option value="moderate">מתון — איזון בין קצב להתמדה</option><option value="focused">ממוקד — עדיין בגבולות שמרניים</option></select></label>
        <label>
          אימונים בשבוע
          <input
            type="number"
            min="0"
            max="14"
            value={values.workouts}
            onChange={(e) => setValues({ ...values, workouts: e.target.value })}
          />
        </label>
        <fieldset className="onboarding-choice-field"><legend>איזה אימון מתאים לך?</legend><div className="profile-choice-chips">{Object.entries(workoutTypeLabels).map(([key,label]) => <button type="button" key={key} className={(values.workoutTypes || []).includes(key) ? "selected" : ""} onClick={() => setValues({ ...values, workoutTypes: (values.workoutTypes || []).includes(key) ? values.workoutTypes.filter((item: string) => item !== key) : [...(values.workoutTypes || []), key] })}>{label}</button>)}</div></fieldset>
      </div>
    </>,
    <>
      <p className="eyebrow">התאמה אישית</p>
      <h1>העדפות ומגבלות</h1>
      <div className="field-stack">
        <fieldset className="diet-style-grid"><legend>סגנון תזונה</legend>{dietStyles.map(([key,title,description]) => <button type="button" key={key} className={values.diet === key ? "selected" : ""} onClick={() => setValues({ ...values, diet: key })}><strong>{title}</strong><small>{description}</small></button>)}</fieldset>
        <label>
          אלרגיות, רגישויות או מזונות להימנע מהם
          <textarea
            value={values.restrictions}
            onChange={(e) =>
              setValues({ ...values, restrictions: e.target.value })
            }
            placeholder="אפשר לדלג"
          />
        </label>
      </div>
    </>,
  ];
  return (
    <main className={values.theme === "dark" ? "onboarding-shell onboarding-dark-preview" : "onboarding-shell"} dir="rtl">
      <header>
        <img src="/caloreazi-wordmark-transparent.png" alt="CALOREAZI" />
        <span>
          {step + 1} / {screens.length}
        </span>
      </header>
      <div className="onboarding-progress">
        <i style={{ width: `${((step + 1) / screens.length) * 100}%` }} />
      </div>
      <section className="onboarding-card">
        {screens[step]}
        {error && <p className="form-error">{error}</p>}
        <footer>
          {step > 0 && <button onClick={() => setStep(step - 1)}>חזרה</button>}
          <button
            className="primary"
            disabled={
              busy ||
              (step === 3 && !values.birthDate) ||
              (step === 0 &&
                (!values.name.trim() ||
                  (bootstrap &&
                    (!values.email.includes("@") ||
                      values.adminPassword.length < 10))))
            }
            onClick={() =>
              step === screens.length - 1 ? finish() : setStep(step + 1)
            }
          >
            {busy
              ? "מכין את המסלול…"
              : step === screens.length - 1
                ? "צור את המסלול שלי"
                : "המשך"}
          </button>
        </footer>
      </section>
      <p className="medical-note">
        היעדים הם נקודת פתיחה כללית ואינם ייעוץ רפואי.
      </p>
    </main>
  );
}
