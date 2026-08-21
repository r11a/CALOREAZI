"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks, jsx-a11y/no-autofocus */

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushOfflineCaptures, offlineCaptureCount, queueOfflineCapture } from "./offline-queue";

type AppState = {
  authenticated?: boolean;
  bootstrapRequired?: boolean;
  owner: null | { name: string; email: string; role: string; avatar?: string };
  currentUser: { id: string; name: string; role: "admin" | "user" };
  profile: any;
  today: { waterMl: number; meals: any[] };
  ai: any;
  aiUsage: any[];
  history: any[];
  measurements: any[];
  favorites: any[];
  activity: any[];
  dailyScore: { score: number; parts: Record<string, number> };
  streak: number;
  coachHistory: { role: "user" | "assistant"; text: string; at?: string }[];
  foods: any[];
  partnerships: any[];
  sharedProfiles: any[];
  adminConfigured: boolean;
};
const emptyOnboarding = {
  name: "",
  email: "",
  goal: "lose",
  sex: "male",
  age: 35,
  height: 175,
  weight: 85,
  targetWeight: 76,
  activity: "light",
  workouts: 2,
  diet: "none",
  restrictions: "",
  theme: "dark",
  adminPassword: "",
};
const goalLabels: Record<string, string> = {
  lose: "ירידה הדרגתית במשקל",
  maintain: "שמירה על המשקל",
  gain: "עלייה מבוקרת במשקל",
  healthy: "אכילה בריאה יותר",
};
const mealSuggestionCatalog = [
  { name: "יוגורט, שיבולת שועל ופירות", periods: ["breakfast", "snack"], kcal: 340, protein: 23, carbs: 43, fat: 8, tags: ["חלבי", "מתוק", "פירות", "מהיר"] },
  { name: "חביתה, קוטג׳ וסלט", periods: ["breakfast", "dinner"], kcal: 390, protein: 34, carbs: 18, fat: 20, tags: ["ביצים", "חלבי", "מלוח", "ירקות"] },
  { name: "כריך טונה וירקות", periods: ["breakfast", "lunch", "dinner"], kcal: 430, protein: 38, carbs: 45, fat: 11, tags: ["דגים", "מלוח", "מהיר"] },
  { name: "חזה עוף, אורז וסלט", periods: ["lunch", "dinner"], kcal: 610, protein: 52, carbs: 66, fat: 14, tags: ["עוף", "אורז", "ירקות", "חם"] },
  { name: "סלמון, בטטה וירקות", periods: ["lunch", "dinner"], kcal: 590, protein: 42, carbs: 48, fat: 24, tags: ["דגים", "ירקות", "חם"] },
  { name: "קערת עדשים, טחינה וירקות", periods: ["lunch", "dinner"], kcal: 520, protein: 25, carbs: 67, fat: 18, tags: ["קטניות", "טבעוני", "ירקות", "חם"] },
  { name: "קוטג׳, פרי ושקדים", periods: ["snack", "breakfast"], kcal: 280, protein: 22, carbs: 28, fat: 10, tags: ["חלבי", "פירות", "מהיר"] },
  { name: "חומוס, ביצה וירקות", periods: ["lunch", "dinner", "snack"], kcal: 410, protein: 20, carbs: 39, fat: 20, tags: ["קטניות", "ביצים", "ירקות", "מלוח"] },
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
function localDateTimeInput(date = new Date()) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
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

function AppIcon({ name }: { name: "camera" | "image" | "plus" | "coach" | "edit" | "water" | "activity" | "home" | "history" | "settings" | "lock" | "search" | "mic" }) {
  const paths = {
    camera: <><path d="M14.5 5 13 3h-2L9.5 5H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><circle cx="12" cy="11.5" r="3.5"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-4-4L7 20"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    coach: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4Z"/><path d="m18.5 15 .7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7Z"/></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></>,
    water: <path d="M12 3s5 5.7 5 10a5 5 0 0 1-10 0c0-4.3 5-10 5-10Z"/>,
    activity: <><path d="M4 12h3l2-5 4 10 2-5h5"/></>,
    home: <><path d="m4 10 8-7 8 7"/><path d="M6 9v11h12V9M10 20v-6h4v6"/></>,
    history: <><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2M5 5 3-2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.5 6A7 7 0 0 0 9 7L6.6 6l-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 10.5 18l.2 2.6h4L15 18a7 7 0 0 0 1.5-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z"/></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></>,
  };
  return <svg className="app-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
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
  const [aiOriginalItems, setAiOriginalItems] = useState<any[]>([]);
  const [mealSource, setMealSource] = useState<"manual" | "photo" | "voice">(
    "manual",
  );
  const [mealTranscript, setMealTranscript] = useState("");
  const [analysisJobId, setAnalysisJobId] = useState("");
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [foodVisibility, setFoodVisibility] = useState<"private" | "shared">(
    "private",
  );
  const [generateFoodArtwork, setGenerateFoodArtwork] = useState(false);
  const [mealPeriod, setMealPeriod] = useState("snack");
  const [mealDateTime, setMealDateTime] = useState(() => localDateTimeInput());
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string; usage?: string }[]
  >([]);
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
    monthlyBudget: 20,
    softLimit: 80,
    hardLimit: true,
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
  const [photoQuality, setPhotoQuality] = useState<{ level: "good" | "warning"; message: string } | null>(null);
  const [mealConfidence, setMealConfidence] = useState<"low" | "medium" | "high">("low");
  const [mealResult, setMealResult] = useState<any>(null);
  const [weightValue, setWeightValue] = useState(0);
  const [weightDate, setWeightDate] = useState("");
  const [weightFeedback, setWeightFeedback] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickCategory, setQuickCategory] = useState("");
  const [quickSearch, setQuickSearch] = useState("");
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
  const [waterOpen, setWaterOpen] = useState(false);
  const [waterValue, setWaterValue] = useState(0);
  const [waterTargetValue, setWaterTargetValue] = useState(2000);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [tasteWizardOpen, setTasteWizardOpen] = useState(false);
  const [tasteWizardStep, setTasteWizardStep] = useState(0);
  const [tasteDraft, setTasteDraft] = useState<any>({ likes: [], dislikes: [], prepTime: "medium" });
  const [suggestionPeriod, setSuggestionPeriod] = useState("lunch");
  const [suggestionRefresh, setSuggestionRefresh] = useState(0);
  const [macroDetail, setMacroDetail] = useState<"protein" | "carbs" | "fat" | "">("");
  const [mealPreview, setMealPreview] = useState<any>(null);
  const [now, setNow] = useState(() => new Date());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySelectedDate, setHistorySelectedDate] = useState("");
  const [historyCalendarMonth, setHistoryCalendarMonth] = useState("");
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsData, setInsightsData] = useState<any>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "הליכה",
    minutes: 30,
    steps: 0,
    distanceKm: 0,
    activeCalories: 0,
  });
  const [trashOpen, setTrashOpen] = useState(false);
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
    daily: true,
    meals: true,
    weight: false,
  });
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [pendingQuickFood, setPendingQuickFood] = useState<any>(null);
  const [manualDescription, setManualDescription] = useState("");
  const [foodCategory, setFoodCategory] = useState("meals");
  const [manualAiMode, setManualAiMode] = useState(false);
  const [catalogOnly, setCatalogOnly] = useState(false);
  const [customFoodOpen, setCustomFoodOpen] = useState(false);
  const [customFoodName, setCustomFoodName] = useState("");
  const [customFoodDraft, setCustomFoodDraft] = useState<any>(null);
  const [customFoodStatus, setCustomFoodStatus] = useState("");
  const [foodLibraryOpen, setFoodLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("all");
  const [libraryVisibility, setLibraryVisibility] = useState("all");
  const [editingFood, setEditingFood] = useState<any>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const directCameraInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const foodImageInput = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mealSaveInFlight = useRef(false);
  const imageCompletionRequested = useRef(new Set<string>());
  const audioChunks = useRef<Blob[]>([]);
  const recordingStartedAt = useRef(0);
  const speechRecognition = useRef<any>(null);
  const browserTranscript = useRef("");
  const voiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceProcessingTimer = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => {
    api("/api/state")
      .then((data) => {
        setState(data);
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
    const meal = state?.today?.meals?.find((item) => item.id && (!item.image || /(?:category-|food-sprite-|generic|placeholder)/i.test(String(item.image))) && !imageCompletionRequested.current.has(item.id));
    if (!meal) return;
    imageCompletionRequested.current.add(meal.id);
    api("/api/meals/image", { method: "POST", body: JSON.stringify({ id: meal.id, allowGenerate: true }) }).then(setState).catch(() => undefined);
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
    const update = () => { setOnline(navigator.onLine); offlineCaptureCount().then(setOfflineQueueCount).catch(() => undefined); if (navigator.onLine) flushOfflineCaptures(async (capture) => { await api("/api/ai/analyze-meal", { method: "POST", headers: { "Idempotency-Key": capture.clientId }, body: JSON.stringify(capture) }); }).then(() => offlineCaptureCount().then(setOfflineQueueCount)).catch(() => undefined); };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("sw.js").catch(() => undefined);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
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
    }
  }, [mealOpen]);
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
    const score = Number(day?.dailyScore?.score || 0); const parts = day?.dailyScore?.parts || {};
    const weakest = [
      [40 - Number(parts.calories || 0), "להתקרב לטווח הקלוריות היומי"],
      [25 - Number(parts.protein || 0), "לפזר יותר חלבון לאורך היום"],
      [20 - Number(parts.water || 0), "להשלים את יעד השתייה"],
      [10 - Number(parts.activity || 0), "להוסיף פעילות קצרה"],
    ].sort((a: any, b: any) => b[0] - a[0])[0]?.[1];
    if (score >= 80) return `יום מאוזן עם ציון ${score}/100. כדאי לשמר את אותה עקביות גם מחר.`;
    if (score >= 60) return `יום בכיוון טוב עם ציון ${score}/100. השיפור המשמעותי ביותר יהיה ${weakest}.`;
    return `ציון היום הוא ${score}/100. הצעד הראשון שכדאי להתמקד בו: ${weakest}.`;
  };
  const scoreTone = scoreToneFor(dailyScore);
  const scoreParts = state?.dailyScore?.parts || {};
  const scoreGuidance = [
    { label: "מאזן קלורי", value: Number(scoreParts.calories || 0), max: 40, tip: "תעד ארוחות והתקרב לטווח הקלוריות היומי." },
    { label: "חלבון", value: Number(scoreParts.protein || 0), max: 25, tip: "הוסף מקור חלבון איכותי לארוחה הבאה." },
    { label: "מים", value: Number(scoreParts.water || 0), max: 20, tip: "השלם בהדרגה את יעד השתייה היומי." },
    { label: "פעילות", value: Number(scoreParts.activity || 0), max: 10, tip: "הוסף הליכה או פעילות של לפחות 30 דקות." },
    { label: "עקביות", value: Number(scoreParts.consistency || 0), max: 5, tip: "תעד לפחות שתי ארוחות כדי לקבל תמונת יום מלאה." },
  ];
  const scoreImprovement = [...scoreGuidance].sort((a, b) => (b.max - b.value) - (a.max - a.value))[0];
  const scoreHeadline = dailyScore >= 80 ? "יום מאוזן מאוד — המשך כך." : dailyScore >= 60 ? `כיוון טוב — ${scoreImprovement.tip}` : dailyScore >= 40 ? `יש בסיס טוב. ${scoreImprovement.tip}` : `אפשר לשפר כבר היום: ${scoreImprovement.tip}`;
  const mealSuggestions = useMemo(() => {
    const taste = profile?.tasteProfile || { likes: [], dislikes: [] }; const likes = taste.likes || []; const dislikes = taste.dislikes || []; const blocked = `${profile?.restrictions || ""} ${profile?.foodAllergies || ""}`.toLocaleLowerCase("he");
    const proteinGap = Math.max(0, Number(profile?.protein || 0) - macros.protein); const carbsGap = Math.max(0, Number(profile?.carbs || 0) - macros.carbs); const fatGap = Math.max(0, Number(profile?.fat || 0) - macros.fat);
    const ranked = mealSuggestionCatalog.filter((meal) => meal.periods.includes(suggestionPeriod) && !meal.tags.some((tag) => dislikes.includes(tag) || blocked.includes(tag.toLocaleLowerCase("he"))) && !(profile?.diet === "vegan" && meal.tags.some((tag) => ["עוף", "דגים", "ביצים", "חלבי"].includes(tag))) && !(profile?.diet === "vegetarian" && meal.tags.some((tag) => ["עוף", "דגים"].includes(tag)))).map((meal) => {
      const preference = meal.tags.filter((tag) => likes.includes(tag)).length * 18; const nutrition = Math.min(proteinGap, meal.protein) * 1.4 + Math.min(carbsGap, meal.carbs) * .25 + Math.min(fatGap, meal.fat) * .35;
      const reason = proteinGap > 20 && meal.protein >= 25 ? `משלימה כ־${meal.protein}g חלבון מהחוסר היומי` : carbsGap > 35 && meal.carbs >= 35 ? "מתאימה לחוסר הנוכחי בפחמימות" : "מאוזנת ביחס למה שנאכל עד עכשיו";
      return { ...meal, rank: preference + nutrition, reason, personal: meal.tags.some((tag) => likes.includes(tag)) };
    }).sort((a, b) => b.rank - a.rank);
    const offset = ranked.length ? suggestionRefresh % ranked.length : 0;
    return [...ranked.slice(offset), ...ranked.slice(0, offset)].slice(0, 3);
  }, [profile, macros, suggestionPeriod, suggestionRefresh]);
  const historyDays = useMemo(() => [...(state?.history || []), ...(state?.today ? [{ ...state.today, dailyScore: state.dailyScore }] : [])], [state?.history, state?.today, state?.dailyScore]);
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
  const weightEntries = state?.measurements || [];
  const latestWeight = weightEntries.at(-1)?.weight || profile?.weight || 0;
  const previousWeight = weightEntries.length > 1 ? Number(weightEntries.at(-2)?.weight) : null;
  const latestWeightDelta = previousWeight === null ? null : Number((Number(latestWeight) - previousWeight).toFixed(1));
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
  const proteinRemaining = Math.max(
    0,
    Number(profile?.protein || 0) - macros.protein,
  );
  const dailyInsights = useMemo(() => {
    if (!profile) return [];
    const items = [];
    if (waterRemaining >= 500)
      items.push({
        icon: "💧",
        title: "כדאי להשלים שתייה",
        text: `חסרים עוד ${waterRemaining.toLocaleString()} מ״ל ליעד היומי.`,
      });
    if (proteinRemaining >= 20)
      items.push({
        icon: "◉",
        title: "חלבון עדיין נמוך",
        text: `חסרים כ־${proteinRemaining} גרם. העדף מקור חלבון בארוחה הבאה.`,
      });
    if (consumed > profile.calories)
      items.push({
        icon: "↗",
        title: "עברת את היעד היומי",
        text: `נצרכו ${consumed - profile.calories} קלוריות מעל היעד. יום אחד אינו קובע מגמה.`,
      });
    else if (remaining > profile.calories * 0.55 && now.getHours() >= 16)
      items.push({
        icon: "◷",
        title: "נשאר פער גדול להיום",
        text: `נותרו ${remaining.toLocaleString()} קלוריות. עדיף לתכנן ארוחה מאוזנת ולא להשלים בבת אחת.`,
      });
    if ((state?.today?.meals?.length || 0) === 0)
      items.push({
        icon: "◷",
        title: "התחלה פשוטה ליום",
        text: "הארוחה הראשונה לא צריכה להיות מושלמת — שלב חלבון, ירק או פרי ומקור אנרגיה.",
      });
    else
      items.push({
        icon: "✓",
        title: "שמור על רצף נוח",
        text: "עדיף לפזר את האכילה לאורך היום ולא להגיע לארוחה הבאה רעב מאוד.",
      });
    items.push({
      icon: "◇",
      title: "שדרוג קטן לארוחה הבאה",
      text: "נסה להוסיף מרכיב טרי וצבעוני. שינוי קטן ועקבי משפיע יותר מתפריט מושלם ליום אחד.",
    });
    if (!items.length)
      items.push({
        icon: "✓",
        title: "אתה בקצב מאוזן",
        text: "המשך לעדכן ארוחות ושתייה כדי לקבל המלצה מדויקת יותר.",
      });
    return items;
  }, [profile, waterRemaining, proteinRemaining, consumed, remaining, now, state?.today?.meals?.length]);
  const dailyRecommendation = useMemo(() => {
    if (!dailyInsights.length) return null;
    const urgent = consumed > Number(profile?.calories || 0)
      ? dailyInsights.find((item) => item.title === "עברת את היעד היומי")
      : null;
    if (urgent) return urgent;
    const slot = now.getDate() + Math.floor(now.getHours() / 4);
    return dailyInsights[slot % dailyInsights.length];
  }, [dailyInsights, consumed, profile?.calories, now]);

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

  async function addWater(amount = 250) {
    try {
      setState(
        await api("/api/water", {
          method: "POST",
          body: JSON.stringify({ amount }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function openWaterEditor() {
    setWaterValue(Number(state?.today?.waterMl || 0));
    setWaterTargetValue(Number(profile?.waterMl || 2000));
    setWaterOpen(true);
  }
  async function saveWater() {
    setBusy(true);
    try {
      setState(
        await api("/api/water", {
          method: "PUT",
          body: JSON.stringify({ amount: waterValue, targetWaterMl: waterTargetValue }),
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
    setTrashOpen(false); setVoiceOpen(false); setPartnerOpen(false); setCustomFoodOpen(false); setFoodLibraryOpen(false); setTasteWizardOpen(false);
    setPendingQuickFood(null); setEditingFood(null);
  }
  function openNavigationScreen(screen: "home" | "history" | "admin" | "coach") {
    closeOpenScreens();
    if (screen === "history") setHistoryOpen(true);
    if (screen === "admin") void openAdmin();
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
    setInsightsOpen(true);
    setWeightValue(Number(latestWeight || 0));
    setWeightDate(state?.today?.date || new Date().toISOString().slice(0, 10));
    setWeightFeedback("");
    try {
      setInsightsData(await api("/api/insights"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveTrendWeight(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setWeightFeedback("");
    if (!(Number(weightValue) >= 25 && Number(weightValue) <= 350)) { setWeightFeedback("יש להזין משקל בין 25 ל־350 ק״ג."); return; }
    setBusy(true);
    try {
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
      setState(
        await api("/api/activity", {
          method: "POST",
          body: JSON.stringify(activityForm),
        }),
      );
      setActivityOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openTrash() {
    setProfileOpen(false);
    setTrashOpen(true);
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
  async function addMeal(event: FormEvent) {
    event.preventDefault();
    if (busy || mealSaveInFlight.current) return;
    setError("");
    const completedFields: string[] = [];
    const normalizedItems = mealItems
      .filter((item) => item.name || item.searchNameEn || item.grams || item.kcalPer100 || item.proteinPer100 || item.carbsPer100 || item.fatPer100)
      .map((item) => {
        const next = { ...item };
        if (!String(next.name || "").trim() && String(next.searchNameEn || "").trim()) { next.name = String(next.searchNameEn).trim(); completedFields.push("שם פריט"); }
        if (!(Number(next.quantity) > 0)) { next.quantity = 1; completedFields.push(`כמות עבור ${next.name || "פריט"}`); }
        if (!(Number(next.kcalPer100) > 0)) {
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
      if (!(Number(item.kcalPer100) > 0)) validationErrors[`item-kcal-${index}`] = `חסרות קלוריות ל־100 גרם עבור ${item.name || `פריט ${index + 1}`}`;
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
    setMealSaveFeedback(completedFields.length ? `הושלמו אוטומטית: ${[...new Set(completedFields)].join(", ")}. שומר כעת…` : "שומר כעת…");
    mealSaveInFlight.current = true;
    setBusy(true);
    try {
      const calculated = normalizedItems.length
        ? normalizedItems.reduce(
            (total, item) => {
              const factor =
                (Math.max(0, Number(item.grams) || 0) *
                  Math.max(0.1, Number(item.quantity) || 1)) /
                100;
              return {
                kcal: total.kcal + Number(item.kcalPer100 || 0) * factor,
                protein:
                  total.protein + Number(item.proteinPer100 || 0) * factor,
                carbs: total.carbs + Number(item.carbsPer100 || 0) * factor,
                fat: total.fat + Number(item.fatPer100 || 0) * factor,
              };
            },
            { kcal: 0, protein: 0, carbs: 0, fat: 0 },
          )
        : normalizedForm;
      const finalMeal = {
        ...normalizedForm,
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
      };
      let latest = state;
      let savedMealId = editingMealId;
      let savedLocalDate = "";
      if (!catalogOnly) {
        const saved = await api("/api/meals", {
          method: editingMealId ? "PATCH" : "POST",
          body: JSON.stringify(
            editingMealId ? { ...finalMeal, id: editingMealId } : finalMeal,
          ),
        });
        savedMealId = saved.savedMealId || savedMealId;
        savedLocalDate = saved.savedLocalDate || "";
        latest = await api("/api/state");
        const persistedMeals = [latest.today, ...(latest.history || [])].flatMap(
          (day: any) => day?.meals || [],
        );
        if (!savedMealId || !persistedMeals.some((meal: any) => meal.id === savedMealId))
          throw new Error("השמירה לא אומתה במסד הנתונים. הארוחה נשארה פתוחה כדי שלא תאבד — נסה שוב.");
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
      setState(latest);
      if (!catalogOnly) setMealResult({ name: finalMeal.name, kcal: finalMeal.kcal, protein: finalMeal.protein, carbs: finalMeal.carbs, fat: finalMeal.fat, edited: Boolean(editingMealId) });
      if (!catalogOnly && savedMealId && !photoPreview) void api("/api/meals/image", { method: "POST", body: JSON.stringify({ id: savedMealId, allowGenerate: true }) }).then((imageState) => { setState(imageState); if (imageState.imageCompleted) setMealResult((current: any) => current ? { ...current, imageCompleted: true } : current); }).catch(() => undefined);
      if (!catalogOnly && savedLocalDate && savedLocalDate !== latest.today?.date)
        setError(`הארוחה נשמרה בהיסטוריה בתאריך ${savedLocalDate}, בהתאם לשעה שנבחרה.`);
      setMealOpen(false);
      setEditingMealId("");
      setMealForm({ name: "", kcal: 0, protein: 0, carbs: 0, fat: 0 });
      setMealItems([]);
      setAiOriginalItems([]);
      setMealSource("manual");
      setMealTranscript("");
      setAnalysisJobId("");
      setPhotoPreview("");
      setPhotoStatus("");
      setPhotoQuality(null);
      setMealConfidence("low");
      setSaveToLibrary(false);
      setFoodVisibility("private");
      setGenerateFoodArtwork(false);
      setMealPeriod("snack");
      setManualDescription("");
      setFoodCategory("meals");
      setManualAiMode(false);
      setCatalogOnly(false);
      setMealValidationErrors({});
      setMealSaveFeedback("");
    } catch (e) {
      const message = (e as Error).message;
      setMealSaveFeedback(`השמירה לא הושלמה: ${message}`);
      setError(message);
    } finally {
      mealSaveInFlight.current = false;
      setBusy(false);
    }
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
  function editMeal(meal: any) {
    const date = new Date(meal.time);
    setEditingMealId(meal.id);
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
    setManualAiMode(false);
    setCatalogOnly(false);
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
  function openProfile() {
    setProfileForm({
      name: state?.owner?.name || "",
      age: profile.age,
      height: profile.height,
      targetWeight: profile.targetWeight,
      activity: profile.activity,
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
      avatar: profile.avatar || "",
    });
    setWeightValue(latestWeight);
    setProfileOpen(true);
  }
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
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
      setProfileOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openTasteWizard() {
    const current = profile?.tasteProfile || { likes: [], dislikes: [], prepTime: "medium" };
    setProfileForm({ name: state?.owner?.name || "", age: profile.age, height: profile.height, targetWeight: profile.targetWeight, activity: profile.activity, diet: profile.diet, restrictions: profile.restrictions || "", diabetesStatus: profile.diabetesStatus || "none", hypertension: Boolean(profile.hypertension), foodAllergies: profile.foodAllergies || "", relevantMedications: profile.relevantMedications || "", pregnancyStatus: profile.pregnancyStatus || "none", trainingDayBonus: profile.trainingDayBonus || 0, targetMode: profile.targetMode || "automatic", customCalories: profile.calories, customProtein: profile.protein, customCarbs: profile.carbs, customFat: profile.fat, avatar: profile.avatar || "", tasteProfile: current });
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
    const confirmation = window.prompt(
      "מחיקה זו מסירה לצמיתות את החשבון, הארוחות, המדידות, השיחות והתמונות. כדי להמשיך הקלד DELETE MY DATA",
    );
    if (confirmation !== "DELETE MY DATA") return;
    setBusy(true);
    try {
      await api("/api/export", {
        method: "DELETE",
        body: JSON.stringify({ confirmation }),
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
      setPartnerForm({ email: "", daily: true, meals: true, weight: false });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function updatePartnership(id: string, action: "accept" | "revoke") {
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
    setManualAiMode(true);
    setManualDescription("");
    setFoodCategory(category);
    setCatalogOnly(false);
    setSaveToLibrary(false);
    setGenerateFoodArtwork(false);
    setPhotoPreview("");
    setMealDateTime(localDateTimeInput());
    setPhotoStatus("תאר את הארוחה וה-AI יחשב ויפרק אותה לפריטים לפני האישור.");
    setQuickAddOpen(false);
    setMealOpen(true);
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
  async function removeCatalogFood(food: any) {
    if (!window.confirm(`להסיר את ${food.name} מספריית המאכלים?`)) return;
    setBusy(true);
    try {
      await api("/api/foods", {
        method: "DELETE",
        body: JSON.stringify({ id: food.id }),
      });
      setState(await api("/api/state"));
      if (editingFood?.id === food.id) setEditingFood(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function selectQuickFood(item: any) {
    setMealPeriod("snack");
    setPendingQuickFood(item);
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
    setMealForm({
      name: `${item.name} · ${item.portion}`,
      kcal: item.kcal,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    });
    setMealItems([]);
    setAiOriginalItems([]);
    setMealSource("manual");
    setManualAiMode(false);
    setPhotoPreview("");
    setMealDateTime(localDateTimeInput());
    setPhotoStatus("ערכים משוערים למנה המקובלת — אפשר לתקן לפני השמירה.");
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
      setPhotoStatus(
        `ה-AI זיהה ${result.items.length} פריטים. ${result.explanation || ""} בדוק ואשר.`,
      );
    } catch (e) {
      setPhotoStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
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
  function useCatalogFood(food: any) {
    setMealForm({
      name: food.name,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    setMealItems(food.items || []);
    setMealSource("manual");
    setPhotoPreview(food.image || "");
    setMealDateTime(localDateTimeInput());
    setPhotoStatus(
      `מהספרייה ${food.visibility === "shared" ? "המשותפת" : "הפרטית"} · נוצר על ידי ${food.ownerName || "המשתמש"}`,
    );
    setMealOpen(true);
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

  async function prepareImage(file: File, maxSize = 1280, quality = 0.76) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/))
      throw new Error("יש לבחור תמונת JPG, PNG או WebP");
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas
      .getContext("2d")
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    return canvas.toDataURL("image/jpeg", quality);
  }
  async function analyzePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMealDateTime(localDateTimeInput());
    setBusy(true);
    setPhotoStatus("מנתח את הארוחה בעזרת AI…");
    try {
      const originalUrl = URL.createObjectURL(file);
      const original = new Image(); original.src = originalUrl; await original.decode();
      const shortestSide = Math.min(original.width, original.height); URL.revokeObjectURL(originalUrl);
      const quality = shortestSide < 640 || file.size < 45_000
        ? { level: "warning" as const, message: "איכות הצילום נמוכה יחסית. מומלץ לצלם שוב מקרוב ובתאורה טובה לקבלת זיהוי מדויק יותר." }
        : { level: "good" as const, message: "איכות ורזולוציית הצילום מתאימות לניתוח." };
      setPhotoQuality(quality);
      const imageDataUrl = await prepareImage(file);
      const clientId = crypto.randomUUID();
      if (!navigator.onLine) { await queueOfflineCapture({ imageDataUrl, clientId, createdAt: new Date().toISOString() }); setOfflineQueueCount(await offlineCaptureCount()); setPhotoPreview(imageDataUrl); setMealSource("photo"); setPhotoStatus("הצילום נשמר במכשיר ויישלח אוטומטית לניתוח כשהחיבור יחזור."); setMealOpen(true); return; }
      setPhotoPreview(imageDataUrl);
      setMealSource("photo");
      setMealItems([]);
      setMealOpen(true);
      let result = await api("/api/ai/analyze-meal", {
        method: "POST",
        headers: { "Idempotency-Key": clientId },
        body: JSON.stringify({ imageDataUrl, clientId }),
      });
      const jobId = result.jobId;
      setAnalysisJobId(jobId || "");
      for (let attempt = 0; !result.items && attempt < 90; attempt += 1) {
        setPhotoStatus(
          result.status === "processing"
            ? "מזהה פריטים וכמויות…"
            : "הצילום נשמר וממתין לניתוח…",
        );
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
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
      setMealForm({ name: result.name, kcal: 0, protein: 0, carbs: 0, fat: 0 });
      setMealItems(result.items);
      setAiOriginalItems(structuredClone(result.items));
      setMealConfidence(result.confidence || "low");
      setPhotoStatus(
        `זוהו ${result.items.length} פריטים (${result.confidence === "high" ? "ביטחון גבוה" : result.confidence === "medium" ? "ביטחון בינוני" : "ביטחון נמוך"}). בדוק משקל וכמות; החישוב יתבצע רק לאחר אישור. ${result.explanation || ""}`,
      );
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
          setPhotoPreview("");
          setMealDateTime(localDateTimeInput());
          setPhotoStatus(
            `תמלול: “${result.transcript}”\nזוהו ${result.items.length} פריטים. בדוק שמות, משקל וכמות; החישוב יתבצע רק באישור.`,
          );
          setSaveToLibrary(true);
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
  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    setMessages((items) => [...items, { role: "user", text }]);
    setMessage("");
    setBusy(true);
    try {
      const data = await api("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: data.reply,
          usage: `${data.usage.totalTokens} tokens · $${data.usage.estimatedCost.toFixed(4)}`,
        },
      ]);
      const latest = await api("/api/state");
      setState(latest);
    } catch (e) {
      setMessages((items) => [
        ...items,
        { role: "assistant", text: (e as Error).message },
      ]);
    } finally {
      setBusy(false);
    }
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

  return (
    <main className={dark ? "app-shell theme-dark" : "app-shell"} dir="rtl">
      {!online && (
        <div className="offline-banner">
          אין כרגע חיבור · הנתונים הקיימים זמינים, פעולות AI יחזרו כשהחיבור
          יתחדש
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
          <button className="avatar" onClick={openProfile} title="הפרופיל שלי">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" />
            ) : (
              state.owner.name[0]
            )}
          </button>
        </div>
      </header>
      <section className="welcome">
        <div><h1>{greeting}, {state.owner.name}</h1><p>{scoreHeadline}</p></div>
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
            <div><strong>הציון היומי שלך: {dailyScore}/100</strong><small>הציון מתעדכן לפי הנתונים שתיעדת היום</small></div>
            <b>{scoreImprovement?.tip}</b>
          </header>
          <div className="score-parts">
            {scoreGuidance.map((part) => (
              <span key={part.label}><small>{part.label}</small><strong>{part.value}/{part.max}</strong></span>
            ))}
          </div>
        </div>
      </details>
      <section className="daily-card">
        <header className="daily-card-heading">
          <div><span>כמות קלוריות יומית</span><strong>{dailyCalorieTarget.toLocaleString()}</strong></div>
          <div><span>נותרו להיום</span><strong>{remaining.toLocaleString()}</strong></div>
        </header>
        <details className="calorie-details">
          <summary aria-label="פתיחת מידע על חישוב יעד הקלוריות">
            <div
              className="calorie-ring"
              style={{
                "--calorie-progress": `${Math.min(100, (consumed / Math.max(1, dailyCalorieTarget)) * 100)}%`,
              }}
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
            <button type="button" className="macro-bar protein" onClick={() => setMacroDetail("protein")} style={{ "--progress": `${Math.min(100, Math.round((macros.protein / Math.max(1, profile.protein)) * 100))}%` } as any}>
              <strong>חלבון · {profile.protein}g ליום</strong>
              <b>{Math.round((macros.protein / Math.max(1, profile.protein)) * 100)}%</b>
              <small>{macros.protein}g נצרכו</small>
            </button>
            <button type="button" className="macro-bar carbs" onClick={() => setMacroDetail("carbs")} style={{ "--progress": `${Math.min(100, Math.round((macros.carbs / Math.max(1, profile.carbs)) * 100))}%` } as any}>
              <strong>פחמימות · {profile.carbs}g ליום</strong>
              <b>{Math.round((macros.carbs / Math.max(1, profile.carbs)) * 100)}%</b>
              <small>{macros.carbs}g נצרכו</small>
            </button>
            <button type="button" className="macro-bar fat" onClick={() => setMacroDetail("fat")} style={{ "--progress": `${Math.min(100, Math.round((macros.fat / Math.max(1, profile.fat)) * 100))}%` } as any}>
              <strong>שומן · {profile.fat}g ליום</strong>
              <b>{Math.round((macros.fat / Math.max(1, profile.fat)) * 100)}%</b>
              <small>{macros.fat}g נצרכו</small>
            </button>
          </div>
        </div>
      </section>
      <section className="primary-actions action-trio">
        <button
          className="camera-action"
          onClick={() => uploadInput.current?.click()}
          disabled={busy}
        >
          <span className="camera-icon"><AppIcon name="camera" /></span>
          <span>
            <strong>צילום ארוחה</strong>
            <small>צלם ארוחה וקבל ניתוח AI</small>
          </span>
          <b>{busy ? "מנתח…" : "צלם עכשיו"}</b>
        </button>
        <input
          ref={uploadInput}
          className="camera-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={analyzePhoto}
        />
        <input
          ref={directCameraInput}
          className="camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={analyzePhoto}
        />
        <button
          className="manual-action"
          onClick={() => {
            setQuickCategory("");
            setQuickAddOpen(true);
          }}
        >
          <span className="manual-icon"><AppIcon name="plus" /></span>
          <span>
            <strong>הוספה ידנית</strong>
            <small>פרי, ירק, משקה או ארוחה</small>
          </span>
        </button>
      </section>
      {error && (
        <button className="notice" onClick={() => setError("")}>
          {error} ×
        </button>
      )}
      {offlineQueueCount > 0 && <aside className="offline-queue-status" role="status">{offlineQueueCount} {offlineQueueCount === 1 ? "צילום ממתין" : "צילומים ממתינים"} לחיבור ולניתוח</aside>}
      {mealResult && <aside className="meal-result-toast" role="status"><div><strong>{mealResult.edited ? "הארוחה עודכנה" : "הארוחה נוספה ליומן"} ✓</strong><span>{mealResult.name} · {mealResult.kcal} קלוריות</span><small>{mealResult.protein}g חלבון · {mealResult.carbs}g פחמימות · {mealResult.fat}g שומן{mealResult.imageCompleted ? " · תמונה הושלמה" : ""}</small></div><button onClick={() => setMealResult(null)} aria-label="סגור">×</button></aside>}
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
        <section className="panel meal-suggestions-panel">
          <header><div><h2>מה כדאי לאכול עכשיו?</h2><p>לפי החוסרים היום והטעם האישי שלך</p></div><div className="suggestion-actions"><button type="button" onClick={() => setSuggestionRefresh((value) => value + 1)}>רענן</button><button type="button" onClick={openTasteWizard}>העדפות</button></div></header>
          <div className="suggestion-periods">{[["breakfast","בוקר"],["lunch","צהריים"],["dinner","ערב"],["snack","בין ארוחות"]].map(([key,label]) => <button type="button" className={suggestionPeriod === key ? "selected" : ""} onClick={() => setSuggestionPeriod(key)} key={key}>{label}</button>)}</div>
          <div className="meal-suggestion-list">{mealSuggestions.map((meal) => <article key={meal.name}><div><strong>{meal.name}</strong><small>{meal.reason}{meal.personal ? " · מתאים להעדפות שלך" : ""}</small></div><span><b>{meal.kcal}</b> kcal</span><footer>{meal.protein}g חלבון · {meal.carbs}g פחמימות · {meal.fat}g שומן</footer></article>)}</div>
          {!profile?.tasteProfile?.completedAt && <button className="taste-survey-callout" type="button" onClick={openTasteWizard}>התאם את ההמלצות אליי · שאלון קצר ולא חובה</button>}
        </section>
        <div className="panel meals-panel">
          <header>
            <div>
              <p className="eyebrow">הארוחות שלי</p>
              <h2>מה אכלת היום</h2>
            </div>
            <button
              onClick={() => {
                setQuickCategory("");
                setQuickAddOpen(true);
              }}
            >
              הוסף ידנית
            </button>
          </header>
          {state.today.meals.length === 0 ? (
            <div className="empty-state">
              עדיין אין ארוחות היום.
              <small>הוסף את הארוחה הראשונה כדי להתחיל לעקוב.</small>
            </div>
          ) : (
            <div className="meal-list">
              {[...state.today.meals]
                .sort((a, b) => String(a.time).localeCompare(String(b.time)))
                .map((meal) => (
                  <article key={meal.id}>
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
          {state.favorites?.length > 0 && (
            <div className="favorites-strip">
              <strong>ארוחות מועדפות</strong>
              <div>
                {state.favorites.map((favorite) => (
                  <button
                    key={favorite.id}
                    onClick={() => repeatFavorite(favorite.id)}
                  >
                    <span>＋</span>
                    {favorite.meal.name}
                    <small>{favorite.meal.kcal} kcal</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {state.foods?.length > 0 && (
            <button
              className="food-library-tile"
              onClick={() => setFoodLibraryOpen(true)}
            >
              <span>▦</span>
              <div>
                <strong>ספריית המאכלים</strong>
                <small>
                  {state.foods.length} מאכלים פרטיים ומשותפים · צפייה, עריכה
                  והסרה
                </small>
              </div>
              <b>←</b>
            </button>
          )}
        </div>
        </div><div className="side-stack">
          <section className="panel water-panel">
            <header>
              <div><p className="eyebrow">שתייה</p><h2>מים היום</h2></div>
              <button className="water-edit" onClick={openWaterEditor} aria-label="עריכת כמות המים">
                {state.today.waterMl}<small>ml</small><span>עריכה</span>
              </button>
            </header>
            <div className="water-control-row" dir="ltr">
              <button onClick={() => addWater(-250)} disabled={state.today.waterMl <= 0} aria-label="הפחתת 250 מיליליטר מים">−</button>
              <div className="water-progress"><i style={{ width: `${Math.min(100, (state.today.waterMl / profile.waterMl) * 100)}%` }} /></div>
              <button onClick={() => addWater(250)} aria-label="הוספת 250 מיליליטר מים">+</button>
            </div>
            <p>{state.today.waterMl.toLocaleString()} מתוך {profile.waterMl.toLocaleString()} מ״ל</p>
          </section>
          <section className="panel insights-panel">
            <header>
              <div>
                <p className="eyebrow">המלצת המאמן</p>
                <h2>{dailyRecommendation?.title || "היום שלך"}</h2>
              </div>
              <button className="insights-more" onClick={openInsights}>
                מגמות
              </button>
            </header>
            <div className="daily-insights">
              {[dailyRecommendation].filter(Boolean).map((item: any) => (
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
              <button onClick={() => setCoachOpen(true)}><AppIcon name="coach" /> שאל את המאמן</button>
            </footer>
          </section>
        </div>
      </section>
      <nav className="bottom-nav">
        <button className={!historyOpen && !settingsOpen && !adminLoginOpen && !coachOpen ? "active" : ""} onClick={() => openNavigationScreen("home")}>
          <span><AppIcon name="home" /></span>היום
        </button>
        <button className={historyOpen ? "active" : ""} onClick={() => openNavigationScreen("history")}>
          <span><AppIcon name="history" /></span>היסטוריה
        </button>
        <button
          className="nav-camera"
          onClick={() => directCameraInput.current?.click()}
          aria-label="צילום ארוחה"
        >
          <AppIcon name="camera" />
        </button>
        <button className={settingsOpen || adminLoginOpen ? "active" : ""} onClick={() => openNavigationScreen("admin")}>
          <span><AppIcon name={isAdmin ? "settings" : "lock"} /></span>
          {isAdmin ? "ניהול" : "Admin"}
        </button>
        <button className={coachOpen ? "active" : ""} onClick={() => openNavigationScreen("coach")}>
          <span><AppIcon name="coach" /></span>מאמן
        </button>
      </nav>
      {macroDetail && (
        <div className="modal-layer macro-detail-layer">
          <button className="backdrop" onClick={() => setMacroDetail("")} aria-label="סגירת הפירוט" />
          <section className={`settings-modal macro-detail-modal ${macroDetail}`}>
            <header><h2>{macroDetail === "protein" ? "חלבון" : macroDetail === "carbs" ? "פחמימות" : "שומן"} מהארוחות היום</h2><button onClick={() => setMacroDetail("")}>×</button></header>
            <div className="macro-source-list">
              {state.today.meals.filter((meal) => Number(meal[macroDetail] || 0) > 0).map((meal) => <span key={meal.id}><strong>{meal.name}</strong><b>{Math.round(Number(meal[macroDetail] || 0))}g</b></span>)}
              {!state.today.meals.some((meal) => Number(meal[macroDetail] || 0) > 0) && <p>אין עדיין מאכלים שתורמים למדד הזה היום.</p>}
            </div>
          </section>
        </div>
      )}
      {mealPreview && (
        <div className="modal-layer meal-preview-layer">
          <button className="backdrop" onClick={() => setMealPreview(null)} aria-label="סגירת פרטי הארוחה" />
          <section className="settings-modal meal-preview-modal">
            <header><div><h2>{mealPreview.name}</h2><small>{periodLabels[mealPreview.period || "snack"]} · {new Date(mealPreview.time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</small></div><button onClick={() => setMealPreview(null)}>×</button></header>
            {mealPreview.image ? <img className="meal-preview-image" src={mealPreview.image} alt={mealPreview.name} /> : <div className="meal-preview-placeholder">🍽</div>}
            <div className="meal-preview-values"><span className="calories"><small>קלוריות</small><strong>{mealPreview.kcal}</strong><b>kcal</b></span><span className="protein"><small>חלבון</small><strong>{mealPreview.protein}g</strong></span><span className="carbs"><small>פחמימות</small><strong>{mealPreview.carbs}g</strong></span><span className="fat"><small>שומן</small><strong>{mealPreview.fat}g</strong></span></div>
            {Array.isArray(mealPreview.items) && mealPreview.items.length > 0 && <div className="meal-preview-items"><strong>מרכיבי הארוחה</strong>{mealPreview.items.map((item: any, index: number) => <span key={`${item.name}-${index}`}><b>{item.name}</b><small>{item.grams ? `${item.grams} גרם` : item.quantity ? `כמות ${item.quantity}` : ""}</small></span>)}</div>}
          </section>
        </div>
      )}
      {coachOpen && (
        <div className="coach-layer">
          <button className="backdrop" onClick={() => setCoachOpen(false)} />
          <aside className="coach-sheet">
            <header>
              <div className="coach-avatar"><AppIcon name="coach" /></div>
              <div>
                <strong>המאמן של CALOREAZI</strong>
                <small>
                  <i /> מחובר לנתוני היום שלך
                </small>
              </div>
              <div className="coach-header-actions">
                <button className="clear-chat" onClick={() => setMessages([])} title="ניקוי התצוגה בלבד; ההיסטוריה נשמרת">נקה מסך</button>
                <button onClick={() => setCoachOpen(false)} aria-label="סגירת המאמן">×</button>
              </div>
            </header>
            <div className="chat-feed">
              {messages.length === 0 && (
                <div className="coach-message">
                  שלום {state.owner.name}, אני מוכן. אפשר לשאול מה כדאי לאכול,
                  איך נראה היום שלך, או לבקש רעיון שמתאים למטרה.
                </div>
              )}
              {messages.map((item, index) => (
                <div key={index} className={`chat-message ${item.role}`}>
                  <span>{item.text}</span>
                  {item.usage && <small>{item.usage}</small>}
                </div>
              ))}
              {busy && <div className="typing">חושב…</div>}
            </div>
            <div className="quick-prompts">
              <button onClick={() => setMessage("מה כדאי לי לאכול עכשיו?")}>
                מה כדאי לאכול?
              </button>
              <button onClick={() => setMessage("איך היום שלי נראה?")}>
                איך היום שלי?
              </button>
              <button onClick={() => setMessage("HELP: איך מוסיפים ארוחה ידנית ושומרים אותה?")}>איך מוסיפים ארוחה?</button>
              <button onClick={() => setMessage("HELP: איך מצלמים ארוחה כדי לקבל זיהוי מדויק?")}>איך מצלמים נכון?</button>
              <button onClick={() => setMessage("HELP: איך מחושב הציון היומי ואיך אפשר לשפר אותו?")}>איך משפרים ציון?</button>
              <button onClick={() => setMessage("HELP: איך משנים את היעדים והפרטים האישיים?")}>איך משנים יעדים?</button>
              <button onClick={() => setMessage("מה חסר לי היום בחלבון, פחמימות, שומן, מים וקלוריות?")}>מה חסר לי היום?</button>
            </div>
            <form onSubmit={sendMessage}>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="שאל את המאמן…"
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
              </div>
              <span className="admin-badge">ADMIN</span>
              {adminHealth && <span className="admin-version">גרסה {adminHealth.version}<small>{adminHealth.build === "development" ? "פיתוח" : adminHealth.build?.slice(0, 7)}</small></span>}
              <button onClick={() => setSettingsOpen(false)}>×</button>
            </header>
            <nav className="admin-nav">
              <button
                className={adminTab === "ai" ? "active" : ""}
                onClick={() => setAdminTab("ai")}
              >
                AI וטוקנים
              </button>
              <button
                className={adminTab === "users" ? "active" : ""}
                onClick={() => setAdminTab("users")}
              >
                משתמשים
              </button>
              <button
                className={adminTab === "security" ? "active" : ""}
                onClick={() => setAdminTab("security")}
              >
                אבטחה
              </button>
              <button
                className={adminTab === "storage" ? "active" : ""}
                onClick={() => setAdminTab("storage")}
              >
                אחסון
              </button>
              <button
                className={adminTab === "database" ? "active" : ""}
                onClick={() => setAdminTab("database")}
              >
                מסד נתונים
              </button>
              <button
                className={adminTab === "backups" ? "active" : ""}
                onClick={() => setAdminTab("backups")}
              >
                גיבויים
              </button>
              <button
                className={adminTab === "audit" ? "active" : ""}
                onClick={() => setAdminTab("audit")}
              >
                Audit
              </button>
              <button onClick={() => { setSettingsOpen(false); void openTrash(); }}>סל מחזור</button>
            </nav>
            {adminHealth && (
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
            <section className="admin-users admin-operations" id="admin-audit">
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
                    <code>{entry.target}</code>
                  </article>
                ))}
                {!adminAudit.length && (
                  <p>אין אירועים חריגים או פעולות ניהול מתועדות.</p>
                )}
              </div>
            </section>
            {aiStatus && <p className="settings-status">{aiStatus}</p>}
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
            <div className="quick-catalog-search"><AppIcon name="search" /><input autoFocus type="search" value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="חיפוש בארוחות, פירות, ירקות ומשקאות…" aria-label="חיפוש בהוספת אוכל" />{quickSearch && <button type="button" onClick={() => setQuickSearch("")} aria-label="ניקוי החיפוש">×</button>}</div>
            {quickSearch.trim() ? (
              <div className="quick-food-grid quick-search-results">
                {Object.entries(quickFoods).flatMap(([category, items]) => items.map((item, index) => ({ ...item, category, index }))).filter((item) => `${item.name} ${item.portion} ${item.category}`.toLocaleLowerCase("he").includes(quickSearch.trim().toLocaleLowerCase("he"))).map((item: any) => <button key={`${item.category}-${item.name}-${item.portion}`} onClick={() => selectQuickFood(item)}><span className="food-sprite" style={foodSpriteStyle(item.category, item.index)} /><strong>{item.name}</strong><small>{item.portion}</small><b>{item.kcal} kcal</b></button>)}
                {(state.foods || []).filter((food) => `${food.name} ${food.category || ""}`.toLocaleLowerCase("he").includes(quickSearch.trim().toLocaleLowerCase("he"))).map((food) => <button key={food.id} onClick={() => selectQuickFood({ ...food, portion: "מנה אישית", icon: "🍽" })}>{food.image ? <img src={food.image} alt={food.name} /> : <span>🍽</span>}<strong>{food.name}</strong><small>מהמאגר האישי</small><b>{food.kcal} kcal</b></button>)}
              </div>
            ) : !quickCategory ? (
              <div className="category-grid">
                <button onClick={() => openManualMeal()}>
                  <span className="manual-meal-art">🍽</span>
                  <strong>ארוחה ידנית</strong>
                  <small>AI יחשב לפי התיאור שלך</small>
                </button>
                <button onClick={() => setVoiceOpen(true)}>
                  <span className="manual-meal-art">🎙️</span>
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
                גיל
                <input
                  type="number"
                  min="14"
                  max="120"
                  value={profileForm.age || ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      age: Number(e.target.value),
                    })
                  }
                />
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
            <section className="health-profile">
              <div><p className="eyebrow">יעדים מקצועיים</p><h3>טווחים ויום אימון</h3></div>
              <div className="settings-grid">
                <label>אופן חישוב<select value={profileForm.targetMode || "automatic"} onChange={(e) => setProfileForm({ ...profileForm, targetMode: e.target.value })}><option value="automatic">אוטומטי ובטוח</option><option value="custom">מותאם אישית</option></select></label>
                <label>תוספת קלוריות ביום אימון<input type="number" min="0" max="600" step="25" value={profileForm.trainingDayBonus || 0} onChange={(e) => setProfileForm({ ...profileForm, trainingDayBonus: Number(e.target.value) })} /></label>
                {profileForm.targetMode === "custom" && <>
                  <label>קלוריות<input type="number" value={profileForm.customCalories || ""} onChange={(e) => setProfileForm({ ...profileForm, customCalories: Number(e.target.value) })} /></label>
                  <label>חלבון<input type="number" value={profileForm.customProtein || ""} onChange={(e) => setProfileForm({ ...profileForm, customProtein: Number(e.target.value) })} /></label>
                  <label>פחמימות<input type="number" value={profileForm.customCarbs || ""} onChange={(e) => setProfileForm({ ...profileForm, customCarbs: Number(e.target.value) })} /></label>
                  <label>שומן<input type="number" value={profileForm.customFat || ""} onChange={(e) => setProfileForm({ ...profileForm, customFat: Number(e.target.value) })} /></label>
                </>}
              </div>
            </section>
            <div className="profile-metrics">
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
            <button className="taste-profile-entry" type="button" onClick={openTasteWizard}><span>♡</span><div><strong>שאלון טעמים והעדפות</strong><small>{profile?.tasteProfile?.completedAt ? `${profile.tasteProfile.likes?.length || 0} העדפות אהובות נשמרו · אפשר לעדכן` : "שאלון קצר ולא חובה להתאמת המלצות הארוחות וה־AI"}</small></div><b>←</b></button>
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
            <button
              className="profile-sharing"
              type="button"
              onClick={openTrash}
            >
              <span>♲</span>
              <div>
                <strong>פריטים שנמחקו</strong>
                <small>שחזור ארוחות ופעילויות למשך 30 יום</small>
              </div>
              <b>‹</b>
            </button>
            <a className="profile-export" href="api/export" download>
              הורד את הנתונים שלי
            </a>
            <button
              className="profile-export"
              type="button"
              onClick={deleteMyData}
            >
              מחק לצמיתות את הנתונים והחשבון שלי
            </button>
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
                <p className="eyebrow">המאגר האישי</p>
                <h2>ספריית המאכלים</h2>
              </div>
              <button onClick={() => setFoodLibraryOpen(false)}>×</button>
            </header>
            <div className="library-filters"><input type="search" value={libraryQuery} onChange={(e) => setLibraryQuery(e.target.value)} placeholder="חיפוש לפי שם" aria-label="חיפוש בספריית המאכלים" /><select value={libraryCategory} onChange={(e) => setLibraryCategory(e.target.value)} aria-label="סינון לפי קטגוריה"><option value="all">כל הסוגים</option><option value="meals">ארוחות</option><option value="fruits">פירות</option><option value="vegetables">ירקות</option><option value="drinks">משקאות</option></select><select value={libraryVisibility} onChange={(e) => setLibraryVisibility(e.target.value)} aria-label="סינון לפי הרשאה"><option value="all">פרטי ומשותף</option><option value="private">פרטי</option><option value="shared">משותף</option></select></div>
            <div className="catalog-list">
              {state.foods.filter((food) => (!libraryQuery.trim() || String(food.name).includes(libraryQuery.trim())) && (libraryCategory === "all" || food.category === libraryCategory) && (libraryVisibility === "all" || food.visibility === libraryVisibility)).map((food) => (
                <article key={food.id}>
                  {food.image ? (
                    <img src={food.image} alt="" />
                  ) : (
                    <span>🍽</span>
                  )}
                  <div>
                    <strong>{food.name}</strong>
                    <small>
                      {food.kcal} kcal ·{" "}
                      {food.visibility === "shared" ? "משותף" : "פרטי"}
                    </small>
                  </div>
                  <button
                    onClick={() => {
                      useCatalogFood(food);
                      setFoodLibraryOpen(false);
                    }}
                  >
                    הוסף
                  </button>
                  {food.ownerId === state.currentUser.id && (
                    <>
                      <button onClick={() => setEditingFood({ ...food })}>
                        ערוך
                      </button>
                      <button
                        className="danger"
                        onClick={() => removeCatalogFood(food)}
                      >
                        הסר
                      </button>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
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
                            {day.meals.length} ארוחות · {day.waterMl || 0} מ״ל
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
                      <section className="history-timeline">
                        {[...day.meals]
                          .sort((a: any, b: any) =>
                            String(a.time).localeCompare(String(b.time)),
                          )
                          .map((meal: any) => (
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
                                <img src={meal.image} alt="" loading="lazy" decoding="async" />
                              ) : (
                                <span className="timeline-icon">🍽</span>
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
            <div className="settings-grid">
              <label>
                סוג פעילות
                <select
                  value={activityForm.type}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, type: e.target.value })
                  }
                >
                  <option>הליכה</option>
                  <option>ריצה</option>
                  <option>אימון כוח</option>
                  <option>רכיבה</option>
                  <option>שחייה</option>
                  <option>פעילות אחרת</option>
                </select>
              </label>
              <label>
                משך בדקות
                <input
                  type="number"
                  min="0"
                  max="600"
                  value={activityForm.minutes}
                  onChange={(e) =>
                    setActivityForm({
                      ...activityForm,
                      minutes: Number(e.target.value),
                    })
                  }
                />
              </label>
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
            </div>
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
          <section className="settings-modal insights-modal">
            <header>
              <div>
                <h2>מגמות ותובנות</h2>
              </div>
              <button onClick={() => setInsightsOpen(false)}>×</button>
            </header>
            <section className="weight-trends">
              <div className="weight-trends-heading">
                <div><strong>מעקב משקל</strong><small>כל עדכון נשמר כמדידה חדשה לפי תאריך ואינו מוחק את ההיסטוריה</small></div>
                <b>{latestWeight ? `${Number(latestWeight).toFixed(1)} ק״ג` : "אין מדידה"}{latestWeightDelta !== null && <small className={latestWeightDelta > 0 ? "weight-up" : latestWeightDelta < 0 ? "weight-down" : "weight-steady"}>{latestWeightDelta > 0 ? "↑" : latestWeightDelta < 0 ? "↓" : "→"} {Math.abs(latestWeightDelta).toFixed(1)}</small>}</b>
              </div>
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
                    {weightChartPoints.map((point: any) => <g key={point.id || point.date}><circle cx={point.x} cy={point.y} r="5" /><text x={point.x} y={point.y - 10}>{Number(point.weight).toFixed(1)}</text></g>)}
                  </svg>
                  <div className="weight-chart-dates"><span>{new Date(`${visibleWeightEntries[0].date}T12:00:00`).toLocaleDateString("he-IL")}</span><strong>{weightChange === 0 ? "ללא שינוי" : `${weightChange > 0 ? "+" : ""}${weightChange} ק״ג`}</strong><span>{new Date(`${visibleWeightEntries.at(-1).date}T12:00:00`).toLocaleDateString("he-IL")}</span></div>
                </div>
              ) : <p className="trend-empty">לאחר שתי מדידות יוצג כאן גרף שינוי ברור. המדידה הקיימת נשמרת.</p>}
              {visibleWeightEntries.length > 0 && <div className="weight-history-list">{[...visibleWeightEntries].reverse().slice(0, 5).map((entry: any, index: number, entries: any[]) => { const previous = entries[index + 1]; const delta = previous ? Number(entry.weight) - Number(previous.weight) : 0; return <span key={entry.id || entry.date}><small>{new Date(`${entry.date}T12:00:00`).toLocaleDateString("he-IL")}</small><strong>{Number(entry.weight).toFixed(1)} ק״ג</strong><b>{previous ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` : "מדידה ראשונה"}</b></span>; })}</div>}
            </section>
            {!insightsData ? (
              <p className="modal-help">מחשב מגמות…</p>
            ) : (
              <>
                {insightsData.sugar?.enabled && (
                  <section className="sugar-insights">
                    <header><div><strong>סוכרים תזונתיים משוערים</strong><small>מוצג בגלל מצב הסוכר שסומן בכרטיס האישי</small></div><b>לא גלוקוז בדם</b></header>
                    <div className="sugar-periods"><span><small>היום</small><strong>{insightsData.sugar.today == null ? "אין נתונים" : `${insightsData.sugar.today}g`}</strong></span><span><small>ממוצע 7 ימים</small><strong>{insightsData.sugar.weeklyAverage == null ? "אין נתונים" : `${insightsData.sugar.weeklyAverage}g`}</strong></span><span><small>ממוצע 30 ימים</small><strong>{insightsData.sugar.monthlyAverage == null ? "אין נתונים" : `${insightsData.sugar.monthlyAverage}g`}</strong></span></div>
                    {insightsData.sugar.days.some((day: any) => day.coverage > 0) ? <div className="sugar-chart" aria-label="גרף צריכת סוכרים תזונתיים ל־30 ימים">{insightsData.sugar.days.map((day: any) => { const maximum = Math.max(1, ...insightsData.sugar.days.map((item: any) => Number(item.sugar || 0))); return <span key={day.date} title={`${day.date}: ${day.sugar} גרם`}><i style={{ height: `${day.coverage ? Math.max(4, day.sugar / maximum * 100) : 0}%` }} /><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}</small></span>; })}</div> : <p className="trend-empty">עדיין אין מספיק ארוחות עם נתון סוכר מאומת. ארוחות חדשות ממקורות תזונה תואמים יצברו נתונים אוטומטית.</p>}
                    <p className="sugar-disclaimer">זהו סך הסוכרים במזון לפי נתוני הקטלוג הזמינים, לא סוכר מוסף ולא מדידת גלוקוז. כיסוי הנתונים בחודש: {insightsData.sugar.coverage}%.</p>
                  </section>
                )}
                <div className="trend-summary">
                  <article>
                    <small>ציון שבועי</small>
                    <strong>{insightsData.summary.weeklyScore || "—"}</strong>
                    <span>
                      {insightsData.summary.previousWeeklyScore
                        ? `${insightsData.summary.weeklyScore >= insightsData.summary.previousWeeklyScore ? "↑" : "↓"} משבוע קודם`
                        : "נדרשים עוד ימים"}
                    </span>
                  </article>
                  <article>
                    <small>ממוצע קלוריות</small>
                    <strong>{insightsData.summary.averageCalories}</strong>
                    <span>ליום, 7 ימים</span>
                  </article>
                  <article>
                    <small>חלבון ממוצע</small>
                    <strong>{insightsData.summary.averageProtein}g</strong>
                    <span>ליום</span>
                  </article>
                  <article>
                    <small>פעילות</small>
                    <strong>{insightsData.summary.activeMinutes}</strong>
                    <span>דקות השבוע</span>
                  </article>
                  <article><small>ימים בטווח</small><strong>{insightsData.summary.targetCompliance}%</strong><span>{insightsData.summary.trackedDays} ימי מעקב</span></article>
                  <article><small>הארוחה המאוזנת</small><strong className="trend-meal-name">{insightsData.summary.topMeal}</strong><span>לפי ציון הארוחה</span></article>
                </div>
                <p className="trend-narrative">{insightsData.narrative}</p>
                <p className="coach-recommendation"><b>המלצת זהב:</b> {insightsData.recommendation}</p>
                <section className="weekly-goal-progress">
                  <header><strong>ממוצע 7 ימים מול היעדים שלך</strong><small>הפס מציג אחוז מהיעד; המספרים מראים בפועל מול היעד</small></header>
                  {[
                    { label: "קלוריות ליום", actual: insightsData.summary.averageCalories, target: profile.calories, unit: "kcal", note: "טווח רצוי: 90%–105% מהיעד", tone: "calories" },
                    { label: "חלבון ליום", actual: insightsData.summary.averageProtein, target: profile.protein, unit: "g", note: "לפחות 90% מהיעד תומך בשובע ובשמירת שריר", tone: "protein" },
                    { label: "פחמימות ליום", actual: insightsData.summary.averageCarbs, target: profile.carbs, unit: "g", note: "ממוצע יומי מול היעד האישי", tone: "carbs" },
                    { label: "שומן ליום", actual: insightsData.summary.averageFat, target: profile.fat, unit: "g", note: "ממוצע יומי מול היעד האישי", tone: "fat" },
                    { label: "מים ליום", actual: insightsData.summary.averageWater, target: profile.waterMl, unit: "מ״ל", note: "ממוצע השתייה בימים האחרונים", tone: "water" },
                    { label: "פעילות שבועית", actual: insightsData.summary.activeMinutes, target: 150, unit: "דק׳", note: "יעד בסיס שימושי: 150 דקות בשבוע", tone: "activity" },
                  ].map((metric) => { const percent = Math.round(Number(metric.actual || 0) / Math.max(1, Number(metric.target || 0)) * 100); return <article className={`goal-progress ${metric.tone}`} key={metric.label}><div><strong>{metric.label}</strong><b>{Number(metric.actual || 0).toLocaleString()} / {Number(metric.target || 0).toLocaleString()} {metric.unit}</b></div><span><i style={{ width: `${Math.min(100, percent)}%` }} /></span><footer><small>{metric.note}</small><em>{percent}%</em></footer></article>; })}
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
      {trashOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setTrashOpen(false)} />
          <section className="settings-modal compact-modal">
            <header>
              <div>
                <p className="eyebrow">Recycle Bin</p>
                <h2>פריטים שנמחקו</h2>
              </div>
              <button onClick={() => setTrashOpen(false)}>×</button>
            </header>
            <p className="modal-help">
              הפריטים נשמרים למשך 30 יום לפני מחיקה קבועה.
            </p>
            <div className="trash-list">
              {trashItems.length ? (
                trashItems.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>
                        {item.data.name || item.data.type || "פריט"}
                      </strong>
                      <small>
                        {item.type === "meal" ? "ארוחה" : "פעילות"} ·{" "}
                        {new Date(item.deletedAt).toLocaleDateString("he-IL")}
                      </small>
                    </div>
                    <div className="trash-actions"><button onClick={() => restoreTrash(item.id)}>שחזר</button><button className="danger" onClick={() => permanentlyDeleteTrash(item.id)}>מחק לצמיתות</button></div>
                  </article>
                ))
              ) : (
                <p>אין פריטים שנמחקו.</p>
              )}
            </div>
          </section>
        </div>
      )}
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
            <p className="modal-help">
              שלח הזמנה לחשבון קיים. השיתוף יתחיל רק לאחר אישור וניתן לביטול בכל
              עת.
            </p>
            <form className="partner-invite" onSubmit={invitePartner}>
              <input
                type="email"
                value={partnerForm.email}
                onChange={(e) =>
                  setPartnerForm({ ...partnerForm, email: e.target.value })
                }
                placeholder="האימייל של בן/בת הזוג"
              />
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
                  משקל ומגמה
                </label>
              </div>
              <button className="primary" disabled={busy || !partnerForm.email}>
                שלח הזמנה
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
                      ארוחות <b>{shared.today.meals.length}</b>
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
              <span>{pendingQuickFood.icon}</span>
              <div>
                <strong>{pendingQuickFood.portion}</strong>
                <small>{pendingQuickFood.kcal} קלוריות</small>
              </div>
            </div>
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
                כן, הוסף
              </button>
            </footer>
          </section>
        </div>
      )}
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
                    autoFocus
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
          <section className="settings-modal compact-modal">
            <header>
              <div>
                <p className="eyebrow">שתייה</p>
                <h2>עריכת מים להיום</h2>
              </div>
              <button onClick={() => setWaterOpen(false)}>×</button>
            </header>
            <div className="water-adjust">
              <button
                onClick={() => setWaterValue(Math.max(0, waterValue - 250))}
              >
                −
              </button>
              <label>
                מ״ל
                <input
                  type="number"
                  min="0"
                  max="20000"
                  step="50"
                  value={waterValue}
                  onChange={(e) => setWaterValue(Number(e.target.value))}
                />
              </label>
              <button
                onClick={() => setWaterValue(Math.min(20000, waterValue + 250))}
              >
                ＋
              </button>
            </div>
            <label className="water-target-field">יעד שתייה יומי<select value={waterTargetValue} onChange={(event) => setWaterTargetValue(Number(event.target.value))}>{[1500,1750,2000,2250,2500,2750].map((amount) => <option key={amount} value={amount}>{(amount / 1000).toLocaleString("he-IL")} ליטר</option>)}</select><small>היעד ישמש את פס המים ואת חישוב הציון היומי.</small></label>
            <footer>
              <button onClick={() => setWaterOpen(false)}>ביטול</button>
              <button className="primary" onClick={saveWater} disabled={busy}>
                שמור
              </button>
            </footer>
          </section>
        </div>
      )}
      {mealOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setMealOpen(false)} />
          <form className="settings-modal meal-modal" onSubmit={addMeal}>
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
                <strong>{Object.keys(mealValidationErrors).length ? "נדרשת השלמה לפני השמירה" : "מצב השמירה"}</strong>
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
                <div className="manual-ai-actions"><button type="button" className="dictation-action" onClick={dictateManualDescription}><AppIcon name="mic" /> הכתבה</button><button type="button" onClick={analyzeManualDescription} disabled={busy || !manualDescription.trim()}>{busy ? "מחשב…" : catalogOnly ? "צור תמונה וחשב ערכים" : "חשב קלוריות עם AI"}</button></div>
                <small>
                  {catalogOnly
                    ? "לאחר החישוב אפשר לבדוק ולתקן את הערכים לפני שמירה בגלריה."
                    : "לאחר החישוב יוצגו כל הפריטים, הכמויות וההנחות לעריכה ולאישור."}
                </small>
              </section>
            )}
            {(!manualAiMode || mealItems.length > 0) && <><div className="settings-grid">
              {photoPreview && (
                <img
                  className="meal-photo-preview wide"
                  src={photoPreview}
                  alt="התמונה שנבחרה לניתוח"
                />
              )}
              {photoStatus && (
                <p className="photo-status wide">{photoStatus}</p>
              )}
              {photoQuality && <p className={`photo-quality ${photoQuality.level} wide`}><strong>{photoQuality.level === "good" ? "צילום תקין" : "כדאי לשפר את הצילום"}</strong><span>{photoQuality.message}</span></p>}
              {mealSource === "photo" && <div className="photo-guide wide"><strong>בדיקת צילום</strong><span>ודא שכל הצלחת מוארת ונמצאת בפריים, שאין מזון מוסתר ושניתן להבין את גודל המנה.</span><small>בביטחון נמוך חובה לבדוק את שם הפריט, המשקל והכמות לפני השמירה.</small></div>}
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
                        <input
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
                        />
                      </label>
                      <label>
                        כמות
                        <input
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
                        />
                      </label>
                      <label>
                        קל׳ ל־100 גרם
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          value={item.kcalPer100 || ""}
                          onChange={(e) =>
                            updateMealItem(
                              index,
                              "kcalPer100",
                              Number(e.target.value),
                            )
                          }
                        />
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
                    <input
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
                    />
                  </label>
                  <label>
                    חלבון (גרם)
                    <input
                      type="number"
                      min="0"
                      value={mealForm.protein || ""}
                      onChange={(e) =>
                        setMealForm({
                          ...mealForm,
                          protein: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    פחמימות (גרם)
                    <input
                      type="number"
                      min="0"
                      value={mealForm.carbs || ""}
                      onChange={(e) =>
                        setMealForm({
                          ...mealForm,
                          carbs: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    שומן (גרם)
                    <input
                      type="number"
                      min="0"
                      value={mealForm.fat || ""}
                      onChange={(e) =>
                        setMealForm({
                          ...mealForm,
                          fat: Number(e.target.value),
                        })
                      }
                    />
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
            </div>
            <section className="library-options">
              <label>
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                />{" "}
                שמור בספריית המאכלים שלי
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
              <button
                className="primary"
                disabled={busy || (manualAiMode && mealItems.length === 0)}
              >
                {busy
                  ? "שומר…"
                  : catalogOnly
                  ? "שמור בגלריה"
                  : mealItems.length
                    ? "אישור, חישוב והוספה"
                    : "שמור ארוחה"}
              </button>
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
          גיל
          <input
            type="number"
            value={values.age}
            onChange={(e) => setValues({ ...values, age: e.target.value })}
          />
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
      </div>
    </>,
    <>
      <p className="eyebrow">התאמה אישית</p>
      <h1>העדפות ומגבלות</h1>
      <div className="field-stack">
        <label>
          סגנון תזונה
          <select
            value={values.diet}
            onChange={(e) => setValues({ ...values, diet: e.target.value })}
          >
            <option value="none">ללא העדפה מיוחדת</option>
            <option value="vegetarian">צמחונות</option>
            <option value="vegan">טבעונות</option>
            <option value="kosher">כשר</option>
          </select>
        </label>
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
