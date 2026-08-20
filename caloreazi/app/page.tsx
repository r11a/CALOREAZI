"use client";

import { useMemo, useState } from "react";

const meals = [
  { icon: "🥣", name: "ארוחת בוקר", detail: "יוגורט, גרנולה ופירות", kcal: 420, time: "08:15" },
  { icon: "🥗", name: "ארוחת צהריים", detail: "עוף, אורז וסלט", kcal: 610, time: "13:10" },
];

export default function Home() {
  const [water, setWater] = useState(5);
  const [coachOpen, setCoachOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const waterMl = useMemo(() => water * 250, [water]);

  return (
    <main className={dark ? "app-shell theme-dark" : "app-shell"} dir="rtl">
      <header className="topbar">
        <div className="logo"><img src="/caloreazi-wordmark-transparent.png" alt="CALOREAZI" /></div>
        <div className="top-actions">
          <button className="theme-toggle" onClick={() => setDark((value) => !value)} aria-label="החלפת ערכת צבעים">{dark ? "☀" : "◐"}</button>
          <button className="avatar" aria-label="פתיחת פרופיל">ר</button>
        </div>
      </header>

      <section className="welcome">
        <div><p className="eyebrow">יום חמישי, 20 באוגוסט</p><h1>בוקר טוב, רונן</h1><p>אתה בקצב טוב. עוד החלטה טובה אחת לארוחת הערב.</p></div>
        <div className="streak"><span>🔥</span><strong>6</strong><small>ימים ברצף</small></div>
      </section>

      <section className="daily-card">
        <div className="calorie-ring" aria-label="1030 מתוך 2050 קלוריות"><div><strong>1,020</strong><span>נשארו</span></div></div>
        <div className="daily-copy">
          <div className="score-row"><span>היום שלך</span><strong>84</strong><small>/ 100</small></div>
          <h2>1,030 מתוך 2,050 קלוריות</h2>
          <div className="macro-grid">
            <span><i className="protein" />חלבון<strong>78 / 130g</strong></span>
            <span><i className="carbs" />פחמימות<strong>112 / 220g</strong></span>
            <span><i className="fat" />שומן<strong>38 / 68g</strong></span>
          </div>
        </div>
      </section>

      <section className="primary-actions">
        <button className="camera-action" onClick={() => alert("צילום וניתוח ארוחה מתחברים בשלב הבא")}>
          <span className="camera-icon">⌾</span><span><strong>מה אכלת?</strong><small>צלם ארוחה וקבל ניתוח תוך רגע</small></span><b>צלם עכשיו</b>
        </button>
        <button className="coach-action" onClick={() => setCoachOpen(true)}>
          <span className="coach-spark">✦</span><span><strong>שאל את המאמן</strong><small>הוא מכיר את היום והמטרות שלך</small></span><b>←</b>
        </button>
      </section>

      <section className="content-grid">
        <div className="panel meals-panel">
          <header><div><p className="eyebrow">הארוחות שלי</p><h2>מה אכלת היום</h2></div><button>הצג הכל</button></header>
          <div className="meal-list">
            {meals.map((meal) => <article key={meal.name}><span className="meal-icon">{meal.icon}</span><div><strong>{meal.name}</strong><small>{meal.detail} · {meal.time}</small></div><b>{meal.kcal}<small> kcal</small></b></article>)}
            <button className="add-manual">＋ הוסף ידנית</button>
          </div>
        </div>
        <div className="side-stack">
          <section className="panel water-panel">
            <header><div><p className="eyebrow">שתייה</p><h2>מים היום</h2></div><strong>{waterMl}<small>ml</small></strong></header>
            <div className="water-glasses" aria-label={`${water} מתוך 10 כוסות`}>{Array.from({ length: 10 }).map((_, index) => <i key={index} className={index < water ? "filled" : ""}>●</i>)}</div>
            <button onClick={() => setWater(Math.min(water + 1, 10))}>＋ כוס 250ml</button>
          </section>
          <section className="insight-card"><span>✦</span><div><p className="eyebrow">תובנה מהמאמן</p><strong>החלבון שלך נמוך מהרגיל</strong><p>בארוחה הבאה כדאי לבחור מקור חלבון איכותי. רוצה רעיון שמתאים למה שנשאר היום?</p></div><button onClick={() => setCoachOpen(true)}>כן, תן לי רעיון</button></section>
        </div>
      </section>

      <nav className="bottom-nav" aria-label="ניווט ראשי">
        <button className="active"><span>⌂</span>היום</button><button><span>▦</span>היסטוריה</button><button className="nav-camera" aria-label="צילום ארוחה">⌾</button><button><span>⌁</span>תובנות</button><button onClick={() => setCoachOpen(true)}><span>✦</span>מאמן</button>
      </nav>

      {coachOpen && <div className="coach-layer" role="dialog" aria-modal="true" aria-label="AI Coach">
        <button className="backdrop" aria-label="סגירה" onClick={() => setCoachOpen(false)} />
        <aside className="coach-sheet">
          <header><div className="coach-avatar">✦</div><div><strong>המאמן של CALOREAZI</strong><small><i /> מכיר את היום והמטרות שלך</small></div><button onClick={() => setCoachOpen(false)}>×</button></header>
          <div className="coach-message">נשארו לך כ־1,020 קלוריות ו־52 גרם חלבון להיום. רוצה שאציע ארוחת ערב לפי מה שיש לך בבית?</div>
          <div className="quick-prompts"><button>מה כדאי לאכול בערב?</button><button>איך היום שלי נראה?</button></div>
          <form onSubmit={(event) => event.preventDefault()}><input aria-label="שאלה למאמן" placeholder="שאל אותי כל דבר על היום שלך…" /><button aria-label="שליחה">↑</button></form>
          <p className="ai-note">המלצות AI הן נקודת פתיחה ואינן ייעוץ רפואי</p>
        </aside>
      </div>}
    </main>
  );
}
