"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { FormEvent, useEffect, useMemo, useState } from "react";

type AppState = {
  authenticated?: boolean;
  bootstrapRequired?: boolean;
  owner: null | { name: string; email: string; role: string };
  currentUser: { id: string; name: string; role: "admin" | "user" };
  profile: any;
  today: { waterMl: number; meals: any[] };
  ai: any;
  aiUsage: any[];
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

async function api(url: string, options?: RequestInit) {
  const target = url.startsWith("/") ? url.slice(1) : url;
  const response = await fetch(target, {
    ...options,
    headers: {
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
  const [mealForm, setMealForm] = useState({
    name: "",
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string; usage?: string }[]
  >([]);
  const [aiForm, setAiForm] = useState({
    provider: "openai",
    model: "gpt-5-mini",
    apiKey: "",
    inputCost: 0.25,
    outputCost: 2,
    monthlyBudget: 20,
    softLimit: 80,
    hardLimit: true,
  });
  const [aiStatus, setAiStatus] = useState("");

  useEffect(() => {
    api("/api/state")
      .then((data) => {
        setState(data);
        if (data.owner) setOnboarding((current) => ({ ...current, name: data.owner.name || "", email: data.owner.email || "" }));
        if (data.currentUser?.role === "admin")
          setAiForm((current) => ({ ...current, ...data.ai, apiKey: "" }));
      })
      .catch((e) => setError(e.message));
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
  const remaining = Math.max(0, Number(profile?.calories || 0) - consumed);
  const usage = useMemo(
    () =>
      state?.aiUsage?.reduce((sum, item) => sum + Number(item.cost || 0), 0) ||
      0,
    [state],
  );
  const isAdmin = state?.currentUser?.role === "admin";

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/api/auth/session", { method: "POST", body: JSON.stringify(loginForm) }); const latest = await api("/api/state"); setState(latest); if (latest.owner) setOnboarding((current) => ({ ...current, name: latest.owner.name, email: latest.owner.email })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function openAdmin() {
    if (isAdmin) { setSettingsOpen(true); api("/api/admin/users").then(setAdminUsers).catch((e) => setError(e.message)); }
    else setAdminLoginOpen(true);
  }

  async function loginAdmin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/admin", { method: "POST", body: JSON.stringify({ password: adminPassword }) });
      const latest = await api("/api/state");
      setState(latest);
      setAiForm((current) => ({ ...current, ...latest.ai, apiKey: "" }));
      setAdminPassword("");
      setAdminLoginOpen(false);
      setSettingsOpen(true);
      setAdminUsers(await api("/api/admin/users"));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function createUser(event: FormEvent) {
    event.preventDefault(); setBusy(true); setAiStatus("");
    try { await api("/api/admin/users", { method: "POST", body: JSON.stringify(newUser) }); setNewUser({ name: "", email: "", password: "" }); setAdminUsers(await api("/api/admin/users")); setAiStatus("המשתמש נוצר ויכול להתחבר ✓"); }
    catch (e) { setAiStatus((e as Error).message); } finally { setBusy(false); }
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
  async function addMeal(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      setState(
        await api("/api/meals", {
          method: "POST",
          body: JSON.stringify(mealForm),
        }),
      );
      setMealOpen(false);
      setMealForm({ name: "", kcal: 0, protein: 0, carbs: 0, fat: 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteMeal(id: string) {
    try {
      setState(
        await api("/api/meals", {
          method: "DELETE",
          body: JSON.stringify({ id }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
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
  if (state.authenticated === false && !state.bootstrapRequired) return <Login values={loginForm} setValues={setLoginForm} submit={login} busy={busy} error={error} adminConfigured={state.adminConfigured} adminPassword={adminPassword} setAdminPassword={setAdminPassword} setupAdmin={loginAdmin} />;
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
          <button
            className="settings-button"
            onClick={openAdmin}
            aria-label={isAdmin ? "מרכז ניהול" : "כניסת מנהל"}
            title={isAdmin ? "מרכז ניהול" : "כניסת ADMIN"}
          >
            {isAdmin ? "⚙" : "🔒"}
          </button>
          <button
            className="theme-toggle"
            onClick={() => setDark(!dark)}
            aria-label="החלפת ערכת צבעים"
          >
            {dark ? "☀" : "◐"}
          </button>
          <button className="avatar" title={isAdmin ? "מנהל מערכת" : "משתמש"}>
            {state.owner.name[0]}
          </button>
        </div>
      </header>
      <section className="welcome">
        <div>
          <p className="eyebrow">המסלול שלך · {goalLabels[profile.goal]}</p>
          <h1>בוקר טוב, {state.owner.name}</h1>
          <p>הנתונים נשמרים. עוד החלטה טובה אחת בכל פעם.</p>
        </div>
        <div className="streak">
          <span>🔥</span>
          <strong>1</strong>
          <small>יום ראשון</small>
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
            <strong>
              {consumed
                ? Math.min(100, Math.round((consumed / profile.calories) * 100))
                : 0}
            </strong>
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
                  קצב שבועי משוער <b>{profile.caloriePlan.expectedWeeklyChangeKg} ק״ג</b>
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
                <small className="safety-note">BMI נמוך מ־18.5: לא הוגדר גירעון קלורי אוטומטי.</small>
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
      <section className="primary-actions">
        <button className="camera-action" onClick={() => setMealOpen(true)}>
          <span className="camera-icon">＋</span>
          <span>
            <strong>מה אכלת?</strong>
            <small>הוסף ארוחה וערכים תזונתיים</small>
          </span>
          <b>הוסף עכשיו</b>
        </button>
        <button className="coach-action" onClick={() => setCoachOpen(true)}>
          <span className="coach-spark">✦</span>
          <span>
            <strong>שאל את המאמן</strong>
            <small>
              {state.ai.keyConfigured
                ? `${state.ai.provider} · ${state.ai.model}`
                : "נדרש חיבור AI בהגדרות"}
            </small>
          </span>
          <b>←</b>
        </button>
      </section>
      {error && (
        <button className="notice" onClick={() => setError("")}>
          {error} ×
        </button>
      )}
      <section className="content-grid">
        <div className="panel meals-panel">
          <header>
            <div>
              <p className="eyebrow">הארוחות שלי</p>
              <h2>מה אכלת היום</h2>
            </div>
            <button onClick={() => setMealOpen(true)}>הוסף ארוחה</button>
          </header>
          {state.today.meals.length === 0 ? (
            <div className="empty-state">
              עדיין אין ארוחות היום.
              <small>הוסף את הארוחה הראשונה כדי להתחיל לעקוב.</small>
            </div>
          ) : (
            <div className="meal-list">
              {state.today.meals.map((meal) => (
                <article key={meal.id}>
                  <span className="meal-icon">🍽</span>
                  <div>
                    <strong>{meal.name}</strong>
                    <small>
                      {meal.protein}g חלבון · {meal.carbs}g פחמימות · {meal.fat}
                      g שומן
                    </small>
                  </div>
                  <b>
                    {meal.kcal}
                    <small> kcal</small>
                  </b>
                  <button
                    className="meal-delete"
                    onClick={() => deleteMeal(meal.id)}
                    aria-label={`מחיקת ${meal.name}`}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="side-stack">
          <section className="panel water-panel">
            <header>
              <div>
                <p className="eyebrow">שתייה</p>
                <h2>מים היום</h2>
              </div>
              <strong>
                {state.today.waterMl}
                <small>ml</small>
              </strong>
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
            <button onClick={addWater}>＋ כוס 250ml</button>
          </section>
          <section className="insight-card">
            <span>✦</span>
            <div>
              <p className="eyebrow">תובנה מהמאמן</p>
              <strong>
                {state.ai.keyConfigured
                  ? "המאמן מחובר ומוכן"
                  : isAdmin
                    ? "חבר ספק AI כדי להתחיל"
                    : "המאמן עדיין לא הוגדר"}
              </strong>
              <p>
                {state.ai.keyConfigured
                  ? "המאמן משתמש בפרופיל ובנתוני היום שלך."
                  : isAdmin
                    ? "הגדר מפתח גלובלי במרכז הניהול."
                    : "רק מנהל המערכת יכול להגדיר את שירות ה־AI."}
              </p>
            </div>
            {(state.ai.keyConfigured || isAdmin) && (
              <button
                onClick={() =>
                  state.ai.keyConfigured
                    ? setCoachOpen(true)
                    : openAdmin()
                }
              >
                {state.ai.keyConfigured ? "פתח שיחה" : "מרכז ניהול"}
              </button>
            )}
          </section>
        </div>
      </section>
      <nav className="bottom-nav">
        <button className="active">
          <span>⌂</span>היום
        </button>
        <button>
          <span>▦</span>היסטוריה
        </button>
        <button className="nav-camera">⌾</button>
        <button onClick={openAdmin}>
          <span>{isAdmin ? "⚙" : "🔒"}</span>{isAdmin ? "ניהול" : "Admin"}
        </button>
        <button onClick={() => setCoachOpen(true)}>
          <span>✦</span>מאמן
        </button>
      </nav>
      {coachOpen && (
        <div className="coach-layer">
          <button className="backdrop" onClick={() => setCoachOpen(false)} />
          <aside className="coach-sheet">
            <header>
              <div className="coach-avatar">✦</div>
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
          <button className="backdrop" onClick={() => setAdminLoginOpen(false)} />
          <form className="settings-modal admin-login" onSubmit={loginAdmin}>
            <header><div><p className="eyebrow">גישה מוגנת</p><h2>{state.adminConfigured ? "כניסת ADMIN" : "הגדרת ADMIN ראשונית"}</h2></div><button type="button" onClick={() => setAdminLoginOpen(false)}>×</button></header>
            <p>{state.adminConfigured ? "הזן את סיסמת המנהל כדי לפתוח את הגדרות המערכת." : "צור סיסמה למנהל. הנתונים הקיימים יישמרו ללא שינוי."}</p>
            <div className="field-stack"><label>סיסמת Admin<input type="password" minLength={8} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoComplete={state.adminConfigured ? "current-password" : "new-password"} /></label></div>
            {error && <p className="form-error">{error}</p>}
            <footer><button type="button" onClick={() => setAdminLoginOpen(false)}>ביטול</button><button className="primary" disabled={busy || adminPassword.length < 8}>{busy ? "מתחבר…" : state.adminConfigured ? "כניסה" : "צור ADMIN"}</button></footer>
          </form>
        </div>
      )}
      {settingsOpen && isAdmin && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setSettingsOpen(false)} />
          <section className="settings-modal admin-center">
            <header>
              <div>
                <p className="eyebrow">CALOREAZI ADMIN</p>
                <h2>מרכז ניהול</h2>
              </div>
              <span className="admin-badge">ADMIN</span>
              <button onClick={() => setSettingsOpen(false)}>×</button>
            </header>
            <nav className="admin-nav">
              <button className="active" onClick={() => document.getElementById("admin-ai")?.scrollIntoView({ behavior: "smooth" })}>AI וטוקנים</button>
              <button onClick={() => document.getElementById("admin-users")?.scrollIntoView({ behavior: "smooth" })}>משתמשים</button>
              <button disabled>הרשאות</button>
              <button disabled>מערכת</button>
            </nav>
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
                  onChange={(e) =>
                    setAiForm({
                      ...aiForm,
                      provider: e.target.value,
                      model:
                        e.target.value === "gemini"
                          ? "gemini-3.6-flash"
                          : "gpt-5-mini",
                    })
                  }
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </label>
              <label>
                מודל
                <input
                  value={aiForm.model}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, model: e.target.value })
                  }
                />
              </label>
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
                  onChange={(e) =>
                    setAiForm({ ...aiForm, inputCost: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                עלות output למיליון tokens
                <input
                  type="number"
                  step="0.01"
                  value={aiForm.outputCost}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, outputCost: Number(e.target.value) })
                  }
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
              <div className="admin-section-title"><div><p className="eyebrow">גישה למערכת</p><h3>משתמשים</h3></div><span>{adminUsers.length} חשבונות</span></div>
              <div className="user-list">{adminUsers.map((user) => <article key={user.id}><div><strong>{user.name}</strong><small>{user.email}</small></div><span className={user.role === "admin" ? "admin-role" : "user-role"}>{user.role.toUpperCase()}</span></article>)}</div>
              <form className="new-user-form" onSubmit={createUser}><h4>יצירת משתמש חדש</h4><div className="settings-grid"><label>שם<input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /></label><label>אימייל<input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></label><label className="wide">סיסמה זמנית<input type="password" minLength={8} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></label></div><button className="primary" disabled={busy || !newUser.name || !newUser.email || newUser.password.length < 8}>צור משתמש</button></form>
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
      {mealOpen && (
        <div className="modal-layer">
          <button className="backdrop" onClick={() => setMealOpen(false)} />
          <form className="settings-modal meal-modal" onSubmit={addMeal}>
            <header>
              <div>
                <p className="eyebrow">יומן יומי</p>
                <h2>הוספת ארוחה</h2>
              </div>
              <button type="button" onClick={() => setMealOpen(false)}>
                ×
              </button>
            </header>
            <div className="settings-grid">
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
              <label>
                קלוריות
                <input
                  type="number"
                  min="1"
                  value={mealForm.kcal || ""}
                  onChange={(e) =>
                    setMealForm({ ...mealForm, kcal: Number(e.target.value) })
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
                    setMealForm({ ...mealForm, carbs: Number(e.target.value) })
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
                    setMealForm({ ...mealForm, fat: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setMealOpen(false)}>
                ביטול
              </button>
              <button
                className="primary"
                disabled={busy || !mealForm.name || !mealForm.kcal}
              >
                שמור ארוחה
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}

function Login({ values, setValues, submit, busy, error, adminConfigured, adminPassword, setAdminPassword, setupAdmin }: any) {
  return <main className="onboarding-shell" dir="rtl"><header><img src="/caloreazi-wordmark-transparent.png" alt="CALOREAZI" /></header><section className="onboarding-card login-card"><p className="eyebrow">ברוך הבא</p><h1>{adminConfigured ? "כניסה לחשבון" : "הגדרת ADMIN"}</h1><p>{adminConfigured ? "הנתונים והיעדים שלך זמינים רק לאחר התחברות." : "זהו שדרוג של התקנה קיימת. הגדר סיסמת מנהל כדי להמשיך; הנתונים יישמרו."}</p>{adminConfigured ? <form onSubmit={submit}><div className="field-stack"><label>אימייל או שם משתמש<input type="text" value={values.login} onChange={(e) => setValues({ ...values, login: e.target.value })} autoComplete="username" /></label><label>סיסמה<input type="password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} autoComplete="current-password" /></label></div>{error && <p className="form-error">{error}</p>}<footer><button className="primary" disabled={busy || !values.login || !values.password}>{busy ? "מתחבר…" : "כניסה"}</button></footer></form> : <form onSubmit={setupAdmin}><div className="field-stack"><label>סיסמת Admin חדשה<input type="password" minLength={8} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoComplete="new-password" /></label></div>{error && <p className="form-error">{error}</p>}<footer><button className="primary" disabled={busy || adminPassword.length < 8}>צור ADMIN</button></footer></form>}</section><p className="medical-note">יצירת משתמש חדש מתבצעת על ידי מנהל המערכת.</p></main>;
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
        {bootstrap && <label>סיסמת Admin <small>לפחות 8 תווים</small><input type="password" minLength={8} value={values.adminPassword} onChange={(e) => setValues({ ...values, adminPassword: e.target.value })} autoComplete="new-password" /></label>}
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
            disabled={busy || (step === 0 && (!values.name.trim() || (bootstrap && (!values.email.includes("@") || values.adminPassword.length < 8))))}
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
