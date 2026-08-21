export type AppIconName = "camera" | "image" | "plus" | "coach" | "edit" | "water" | "activity" | "home" | "history" | "settings" | "lock" | "search" | "mic";

export function AppIcon({ name }: { name: AppIconName }) {
  const paths = {
    camera: <><path d="M14.5 5 13 3h-2L9.5 5H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><circle cx="12" cy="11.5" r="3.5"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-4-4L7 20"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    coach: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4Z"/><path d="m18.5 15 .7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7Z"/></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></>,
    water: <path d="M12 3s5 5.7 5 10a5 5 0 0 1-10 0c0-4.3 5-10 5-10Z"/>,
    activity: <path d="M4 12h3l2-5 4 10 2-5h5"/>,
    home: <><path d="m4 10 8-7 8 7"/><path d="M6 9v11h12V9M10 20v-6h4v6"/></>,
    history: <><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2M5 5 3-2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.5 6A7 7 0 0 0 9 7L6.6 6l-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 10.5 18l.2 2.6h4L15 18a7 7 0 0 0 1.5-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z"/></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></>,
  };
  return <svg className="app-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
