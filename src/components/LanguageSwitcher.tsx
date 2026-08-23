"use client";

import { useLocale } from "@/components/I18nProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center rounded-full border border-line bg-panel/70 p-0.5 text-xs">
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`rounded-full px-2.5 py-1 font-mono uppercase transition ${
            locale === l ? "bg-accent text-ink font-semibold" : "text-muted hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
