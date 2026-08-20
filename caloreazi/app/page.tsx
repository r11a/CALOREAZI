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
  adminPassword: "",
};
const goalLabels: Record<string, string> = {
  lose: "ירידה הדרגתית במשקל",
  maintain: "שמירה על המשקל",
  gain: "עלייה מבוקרת במשקל",
  healthy: "אכילה בריאה יותר",
};
const periodLabels: Record<string, string> = {
  breakfast: "ארוחת בוקר",
  lunch: "ארוחת צהריים",
  dinner: "ארוחת ערב",
  snack: "בין הארוחות",
};
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

function AppIcon({ name }: { name: "camera" | "image" | "plus" | "coach" | "edit" | "water" | "activity" | "home" | "history" | "settings" | "lock" }) {
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
  const [mealDateTime, setMealDateTime] = useState(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  });
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
  const [weightValue, setWeightValue] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickCategory, setQuickCategory] = useState("");
  const [adminHealth, setAdminHealth] = useState<any>(null);
  const [adminTab, setAdminTab] = useState("ai");
  const [adminBackups, setAdminBackups] = useState<any[]>([]);
  const [adminAudit, setAdminAudit] = useState<any[]>([]);
  const [storageForm, setStorageForm] = useState({
    backupDestination: "internal",
    backupRelativePath: "CALOREAZI/Backups",
    galleryDestination: "internal",
    galleryRelativePath: "CALOREAZI/Gallery",
  });
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [online, setOnline] = useState(true);
  const [waterOpen, setWaterOpen] = useState(false);
  const [waterValue, setWaterValue] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [now, setNow] = useState(() => new Date());
  const [historyOpen, setHistoryOpen] = useState(false);
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
  const [cameraChoiceOpen, setCameraChoiceOpen] = useState(false);
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
  const photoInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const foodImageInput = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
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
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("sw.js").catch(() => undefined);
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
  }, [dark]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible")
        api("/api/state")
          .then(setState)
          .catch(() => undefined);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
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
  const usage = useMemo(
    () =>
      state?.aiUsage?.reduce((sum, item) => sum + Number(item.cost || 0), 0) ||
      0,
    [state],
  );
  const isAdmin = state?.currentUser?.role === "admin";
  const weightEntries = state?.measurements || [];
  const latestWeight = weightEntries.at(-1)?.weight || profile?.weight || 0;
  const weightChange =
    weightEntries.length > 1
      ? Number(
          (weightEntries.at(-1).weight - weightEntries[0].weight).toFixed(1),
        )
      : 0;
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
    if (!items.length)
      items.push({
        icon: "✓",
        title: "אתה בקצב מאוזן",
        text: "המשך לעדכן ארוחות ושתייה כדי לקבל המלצה מדויקת יותר.",
      });
    return items.slice(0, 3);
  }, [profile, waterRemaining, proteinRemaining, consumed, remaining, now]);

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
    const [users, aiData, health, backups, audit, storage] = await Promise.all([
      api("/api/admin/users"),
      api("/api/ai/settings"),
      api("/api/admin/health"),
      api("/api/admin/backups"),
      api("/api/admin/audit"),
      api("/api/admin/storage"),
    ]);
    setAdminUsers(users);
    setModelCatalog(aiData.models);
    setImageModelCatalog(aiData.imageModels || { openai: [], gemini: [] });
    setAdminHealth(health);
    setAdminBackups(backups.backups || []);
    setAdminAudit(audit.items || []);
    setStorageForm(storage.settings);
    setStorageStatus(storage.status);
    const available = aiData.models[aiData.settings.provider] || [];
    const selected =
      available.find((item: any) => item.id === aiData.settings.model) ||
      available[0];
    setAiForm((current) => ({
      ...current,
      ...aiData.settings,
      coachModel: aiData.settings.roles?.coach?.model || selected?.id,
      visionModel: aiData.settings.roles?.vision?.model || selected?.id,
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
      const data = await api("/api/admin/backups", { method: "POST" });
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

  async function openAdmin() {
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
        body: JSON.stringify(onboarding),
      });
      setState(data);
      setAiForm((current) => ({ ...current, ...data.ai, apiKey: "" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addWater() {
    try {
      setState(
        await api("/api/water", {
          method: "POST",
          body: JSON.stringify({ amount: 250 }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function openWaterEditor() {
    setWaterValue(Number(state?.today?.waterMl || 0));
    setWaterOpen(true);
  }
  async function saveWater() {
    setBusy(true);
    try {
      setState(
        await api("/api/water", {
          method: "PUT",
          body: JSON.stringify({ amount: waterValue }),
        }),
      );
      setWaterOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openInsights() {
    setInsightsOpen(true);
    try {
      setInsightsData(await api("/api/insights"));
    } catch (e) {
      setError((e as Error).message);
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
  async function addMeal(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const calculated = mealItems.length
        ? mealItems.reduce(
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
        : mealForm;
      const finalMeal = {
        ...mealForm,
        period: mealPeriod,
        occurredAt: new Date(mealDateTime).toISOString(),
        kcal: Math.round(calculated.kcal),
        protein: Math.round(calculated.protein),
        carbs: Math.round(calculated.carbs),
        fat: Math.round(calculated.fat),
        items: mealItems,
        aiOriginalItems,
        source: mealSource,
        transcript: mealTranscript,
        image: photoPreview,
        analysisJobId,
      };
      let latest = state;
      if (!catalogOnly)
        latest = await api("/api/meals", {
          method: editingMealId ? "PATCH" : "POST",
          body: JSON.stringify(
            editingMealId ? { ...finalMeal, id: editingMealId } : finalMeal,
          ),
        });
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
      setSaveToLibrary(false);
      setFoodVisibility("private");
      setGenerateFoodArtwork(false);
      setMealPeriod("snack");
      setManualDescription("");
      setFoodCategory("meals");
      setManualAiMode(false);
      setCatalogOnly(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
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
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
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
    setMealDateTime(date.toISOString().slice(0, 16));
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
        body: JSON.stringify(profileForm),
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

  async function prepareImage(file: File, maxSize = 1600, quality = 0.82) {
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
    setBusy(true);
    setPhotoStatus("מנתח את הארוחה בעזרת AI…");
    try {
      const imageDataUrl = await prepareImage(file);
      const clientId = crypto.randomUUID();
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
      const recorder = new MediaRecorder(stream);
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
        const form = new FormData();
        form.set(
          "audio",
          blob,
          `meal-recording.${mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm"}`,
        );
        form.set("browserTranscript", browserTranscript.current);
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
            body: form,
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
        <div>
          <p className="eyebrow">המסלול שלך · {goalLabels[profile.goal]}</p>
          <button className="welcome-name" onClick={openProfile}>
            <h1>
              {greeting}, {state.owner.name}
            </h1>
            <span>פרטים אישיים ›</span>
          </button>
          <p>הנתונים נשמרים. עוד החלטה טובה אחת בכל פעם.</p>
        </div>
        <div className="streak">
          <span>🔥</span>
          <strong>{state.streak || 0}</strong>
          <small>{state.streak === 1 ? "יום ברצף" : "ימים ברצף"}</small>
        </div>
      </section>
      <section className="daily-card">
        <div
          className="calorie-ring"
          style={{
            background: `conic-gradient(var(--orange) 0 ${Math.min(100, (consumed / profile.calories) * 100)}%,var(--line) 0)`,
          }}
        >
          <div>
            <strong>{remaining.toLocaleString()}</strong>
            <span>נשארו</span>
          </div>
        </div>
        <div className="daily-copy">
          <div className="score-row">
            <span>היום שלך</span>
            <strong>{state.dailyScore?.score || 0}</strong>
            <small>/ 100</small>
          </div>
          <h2>
            {consumed.toLocaleString()} מתוך {profile.calories.toLocaleString()}{" "}
            קלוריות
          </h2>
          {profile.caloriePlan && (
            <details className="calorie-explanation">
              <summary>איך חושב היעד?</summary>
              <div>
                <span>
                  BMI <b>{profile.caloriePlan.bmi}</b>
                </span>
                <span>
                  חילוף חומרים במנוחה{" "}
                  <b>{profile.caloriePlan.bmr.toLocaleString()}</b>
                </span>
                <span>
                  תחזוקה משוערת{" "}
                  <b>
                    {profile.caloriePlan.maintenanceCalories.toLocaleString()}
                  </b>
                </span>
                <span>
                  התאמה למטרה{" "}
                  <b>
                    {profile.caloriePlan.goalAdjustment > 0 ? "+" : ""}
                    {profile.caloriePlan.goalAdjustment}
                  </b>
                </span>
                <span>
                  יעד יומי <b>{profile.calories.toLocaleString()}</b>
                </span>
                <span>
                  קצב שבועי משוער{" "}
                  <b>{profile.caloriePlan.expectedWeeklyChangeKg} ק״ג</b>
                </span>
              </div>
              <small>
                נוסחת {profile.caloriePlan.formula} × מקדם פעילות{" "}
                {profile.caloriePlan.activityFactor}. האימונים נשמרים להתאמת
                האימון ואינם נספרים שוב כדי למנוע כפל.
              </small>
              {profile.caloriePlan.safetyFloorApplied && (
                <small className="safety-note">
                  הופעלה רצפת בטיחות כדי למנוע יעד נמוך מדי.
                </small>
              )}
              {profile.caloriePlan.goalAdjustedForBmi && (
                <small className="safety-note">
                  BMI נמוך מ־18.5: לא הוגדר גירעון קלורי אוטומטי.
                </small>
              )}
            </details>
          )}
          <div className="macro-grid">
            <span>
              <i className="protein" />
              חלבון
              <strong>
                {macros.protein} / {profile.protein}g
              </strong>
            </span>
            <span>
              <i className="carbs" />
              פחמימות
              <strong>
                {macros.carbs} / {profile.carbs}g
              </strong>
            </span>
            <span>
              <i className="fat" />
              שומן
              <strong>
                {macros.fat} / {profile.fat}g
              </strong>
            </span>
          </div>
        </div>
      </section>
      <section className="primary-actions action-trio">
        <button
          className="camera-action"
          onClick={() => setCameraChoiceOpen(true)}
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
          ref={photoInput}
          className="camera-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={analyzePhoto}
        />
        <input
          ref={uploadInput}
          className="camera-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
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
                    {meal.image ? (
                      <img className="meal-thumb" src={meal.image} alt="" />
                    ) : (
                      <span
                        className={`meal-icon meal-${meal.period || "snack"}`}
                      >
                        🍽
                      </span>
                    )}
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
        <div className="side-stack">
          <section className="panel insights-panel">
            <header>
              <div>
                <p className="eyebrow">המלצת המאמן</p>
                <h2>{dailyInsights[0]?.title || "היום שלך"}</h2>
              </div>
              <button className="insights-more" onClick={openInsights}>
                מגמות
              </button>
            </header>
            <div className="daily-insights">
              {dailyInsights.slice(0, 1).map((item) => (
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
          <section className="panel water-panel">
            <header>
              <div>
                <p className="eyebrow">שתייה</p>
                <h2>מים היום</h2>
              </div>
              <button
                className="water-edit"
                onClick={openWaterEditor}
                aria-label="עריכת כמות המים"
              >
                {state.today.waterMl}
                <small>ml</small>
                <span>עריכה</span>
              </button>
            </header>
            <div className="water-progress">
              <i
                style={{
                  width: `${Math.min(100, (state.today.waterMl / profile.waterMl) * 100)}%`,
                }}
              />
            </div>
            <p>
              {state.today.waterMl.toLocaleString()} מתוך{" "}
              {profile.waterMl.toLocaleString()} מ״ל
            </p>
            <button onClick={addWater}><AppIcon name="water" /> כוס 250ml</button>
          </section>
        </div>
      </section>
      <nav className="bottom-nav">
        <button className="active">
          <span><AppIcon name="home" /></span>היום
        </button>
        <button onClick={() => setHistoryOpen(true)}>
          <span><AppIcon name="history" /></span>היסטוריה
        </button>
        <button
          className="nav-camera"
          onClick={() => photoInput.current?.click()}
          aria-label="צילום ארוחה"
        >
          <AppIcon name="camera" />
        </button>
        <button onClick={openAdmin}>
          <span><AppIcon name={isAdmin ? "settings" : "lock"} /></span>
          {isAdmin ? "ניהול" : "Admin"}
        </button>
        <button onClick={() => setCoachOpen(true)}>
          <span><AppIcon name="coach" /></span>מאמן
        </button>
      </nav>
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
              <button onClick={() => setCoachOpen(false)}>×</button>
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
                כל גיבוי כולל משתמשים, הגדרות ונתוני תזונה. לפני שחזור נוצר
                Safety Backup אוטומטי.
              </p>
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
            {!quickCategory ? (
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
                  onClick={() => setQuickCategory("")}
                >
                  → חזרה לקטגוריות
                </button>
                <div className={`quick-food-grid ${quickCategory}`}>
                  {quickFoods[quickCategory].map((item, index) => (
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
                    .filter((food) => food.category === quickCategory)
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
              <label>
                משקל נוכחי (ק״ג)
                <input
                  type="number"
                  min="25"
                  max="350"
                  step="0.1"
                  value={weightValue || ""}
                  onChange={(e) => setWeightValue(Number(e.target.value))}
                />
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
              <span>
                משקל נוכחי <b>{latestWeight} ק״ג</b>
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
            <div className="history-days">
              {[...(state.history || []), state.today]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((day) => {
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
                    <details
                      key={day.date}
                      open={day.date === state.today.date}
                    >
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
                          className={`history-calories ${statuses.kcal.className}`}
                        >
                          <b>
                            {totals.kcal.toLocaleString()} /{" "}
                            {goals.kcal.toLocaleString()}
                          </b>
                          <small>kcal · {statuses.kcal.label}</small>
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
                                <img src={meal.image} alt="" />
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
                <p className="eyebrow">Day · Week · Month</p>
                <h2>מגמות ותובנות</h2>
              </div>
              <button onClick={() => setInsightsOpen(false)}>×</button>
            </header>
            {!insightsData ? (
              <p className="modal-help">מחשב מגמות…</p>
            ) : (
              <>
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
                <div className="score-chart">
                  {insightsData.daily.slice(-14).map((day: any) => (
                    <div key={day.date} title={`${day.date}: ${day.score}`}>
                      <i style={{ height: `${Math.max(6, day.score)}%` }} />
                      <small>
                        {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                          "he-IL",
                          { day: "numeric" },
                        )}
                      </small>
                    </div>
                  ))}
                </div>
                <div className="trend-legend">
                  <span>
                    <i className="good" /> 80–100 מאוזן
                  </span>
                  <span>
                    <i className="attention" /> 55–79 דורש תשומת לב
                  </span>
                  <span>
                    <i className="low" /> מתחת ל־55
                  </span>
                </div>
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
                    <button onClick={() => restoreTrash(item.id)}>שחזר</button>
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
      {cameraChoiceOpen && (
        <div className="modal-layer">
          <button
            className="backdrop"
            onClick={() => setCameraChoiceOpen(false)}
          />
          <section className="settings-modal capture-choice">
            <header>
              <div>
                <p className="eyebrow">ניתוח ארוחה</p>
                <h2>איך להוסיף תמונה?</h2>
              </div>
              <button onClick={() => setCameraChoiceOpen(false)}>×</button>
            </header>
            <div>
              <button
                onClick={() => {
                  setCameraChoiceOpen(false);
                  photoInput.current?.click();
                }}
              >
                <span><AppIcon name="camera" /></span>
                <strong>צלם עכשיו</strong>
                <small>פתח את המצלמה האחורית</small>
              </button>
              <button
                onClick={() => {
                  setCameraChoiceOpen(false);
                  uploadInput.current?.click();
                }}
              >
                <span><AppIcon name="image" /></span>
                <strong>בחר מהגלריה</strong>
                <small>תמונה קיימת בטלפון או במחשב</small>
              </button>
            </div>
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
                <button
                  type="button"
                  onClick={analyzeManualDescription}
                  disabled={busy || !manualDescription.trim()}
                >
                  {busy
                    ? "מחשב…"
                    : catalogOnly
                      ? "צור תמונה וחשב ערכים"
                      : "חשב אוטומטית עם AI"}
                </button>
                <small>
                  {catalogOnly
                    ? "לאחר החישוב אפשר לבדוק ולתקן את הערכים לפני שמירה בגלריה."
                    : "לאחר החישוב יוצגו כל הפריטים, הכמויות וההנחות לעריכה ולאישור."}
                </small>
              </section>
            )}
            <div className="settings-grid">
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
              <label className="wide">
                שם הארוחה
                <input
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
                        className="item-name"
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
            <footer>
              {editingMealId && <button className="danger" type="button" onClick={async () => { await deleteMeal(editingMealId); setEditingMealId(""); setMealOpen(false); }}>מחק ארוחה</button>}
              <button type="button" onClick={() => setMealOpen(false)}>
                ביטול
              </button>
              <button
                className="primary"
                disabled={
                  busy ||
                  !mealForm.name ||
                  (mealItems.length
                    ? mealItems.some(
                        (item) => !item.name || !item.grams || !item.kcalPer100,
                      )
                    : !mealForm.kcal)
                }
              >
                {catalogOnly
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
    <main className="onboarding-shell" dir="rtl">
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
