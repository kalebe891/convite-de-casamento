import type { TenantThemeId } from "@/themes/registry";
import { cn } from "@/lib/utils";

/**
 * Mini landing estática (thumbnail) por tema.
 * Isolamento de CSS: cores e fontes aplicadas por inline style.
 * Não toca em document/body nem altera CSS variables globais.
 */

interface ThemeTokens {
  bg: string;
  fg: string;
  card: string;
  primary: string;
  primaryFg: string;
  accent: string;
  muted: string;
  border: string;
  fontHeading: string;
  fontBody: string;
  ornament?: "deco" | "boho" | "minimal" | "serif" | "none";
}

const TOKENS: Record<TenantThemeId, ThemeTokens> = {
  legacy: {
    bg: "#fdfaf6",
    fg: "#2b2b2b",
    card: "#ffffff",
    primary: "#c5a572",
    primaryFg: "#ffffff",
    accent: "#e9d9b8",
    muted: "#f2ede3",
    border: "#e6dcc6",
    fontHeading: "'Playfair Display', serif",
    fontBody: "'DM Sans', sans-serif",
    ornament: "serif",
  },
  editorial: {
    bg: "#fafafa",
    fg: "#1a1a1a",
    card: "#ffffff",
    primary: "#1a1a1a",
    primaryFg: "#fafafa",
    accent: "#8b6f47",
    muted: "#f0f0f0",
    border: "#d9d9d9",
    fontHeading: "'Cormorant Garamond', serif",
    fontBody: "'DM Sans', sans-serif",
    ornament: "serif",
  },
  minimal: {
    bg: "#ffffff",
    fg: "#2d2d2d",
    card: "#fafafa",
    primary: "#2d2d2d",
    primaryFg: "#ffffff",
    accent: "#666666",
    muted: "#f5f5f5",
    border: "#e5e5e5",
    fontHeading: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
    ornament: "minimal",
  },
  "modern-noir": {
    bg: "#0a0a1a",
    fg: "#f5f7fa",
    card: "#141428",
    primary: "#4f46e5",
    primaryFg: "#ffffff",
    accent: "#d4af37",
    muted: "#1a1a2e",
    border: "#23234a",
    fontHeading: "'DM Sans', sans-serif",
    fontBody: "'DM Sans', sans-serif",
    ornament: "none",
  },
  "art-deco": {
    bg: "#f0ebe3",
    fg: "#1a1a1a",
    card: "#ffffff",
    primary: "#c9a84c",
    primaryFg: "#ffffff",
    accent: "#c9a227",
    muted: "#ebe4d6",
    border: "#d8c79a",
    fontHeading: "'Playfair Display', serif",
    fontBody: "'DM Sans', sans-serif",
    ornament: "deco",
  },
  "sky-peach": {
    bg: "#e0f2fe",
    fg: "#1e293b",
    card: "#f8fafc",
    primary: "#2e6b8a",
    primaryFg: "#ffffff",
    accent: "#f4b6a6",
    muted: "#d6ecfb",
    border: "#bcdcf0",
    fontHeading: "'Outfit', sans-serif",
    fontBody: "'Figtree', sans-serif",
    ornament: "none",
  },
};

const FICTIONAL = {
  couple: "Ana & João",
  date: "15 · Maio · 2027",
};

function Ornament({ kind, color }: { kind: ThemeTokens["ornament"]; color: string }) {
  if (kind === "deco") {
    return (
      <svg width="28" height="6" viewBox="0 0 28 6" aria-hidden>
        <path d="M0 3 L10 3 M18 3 L28 3 M14 0 L17 3 L14 6 L11 3 Z" stroke={color} strokeWidth="0.7" fill="none" />
      </svg>
    );
  }
  if (kind === "serif") {
    return <div style={{ width: 18, height: 1, background: color, opacity: 0.7 }} />;
  }
  if (kind === "boho") {
    return (
      <svg width="22" height="6" viewBox="0 0 22 6" aria-hidden>
        <path d="M0 3 Q5.5 0 11 3 T22 3" stroke={color} strokeWidth="0.6" fill="none" />
      </svg>
    );
  }
  if (kind === "minimal") {
    return <div style={{ width: 10, height: 1, background: color }} />;
  }
  return null;
}

interface Props {
  themeId: TenantThemeId;
  selected?: boolean;
}

export default function ThemePreview({ themeId, selected }: Props) {
  const t = TOKENS[themeId] ?? TOKENS.legacy;

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-md border",
        "transition-all",
      )}
      style={{
        background: t.bg,
        color: t.fg,
        borderColor: selected ? t.primary : t.border,
        fontFamily: t.fontBody,
      }}
    >
      {/* Hero */}
      <div
        className="px-2 pt-2 pb-1.5 flex flex-col items-center gap-1"
        style={{
          background: `linear-gradient(180deg, ${t.muted} 0%, ${t.bg} 100%)`,
        }}
      >
        <Ornament kind={t.ornament} color={t.accent} />
        <div
          className="leading-tight text-center"
          style={{
            fontFamily: t.fontHeading,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: t.ornament === "deco" ? "0.05em" : "-0.005em",
          }}
        >
          {FICTIONAL.couple}
        </div>
        <div
          style={{
            fontSize: 6.5,
            letterSpacing: "0.08em",
            opacity: 0.7,
            textTransform: "uppercase",
          }}
        >
          {FICTIONAL.date}
        </div>
        <Ornament kind={t.ornament} color={t.accent} />
      </div>

      {/* RSVP button */}
      <div className="px-2 pb-1.5 flex justify-center">
        <div
          style={{
            background: t.primary,
            color: t.primaryFg,
            fontSize: 6.5,
            padding: "2px 8px",
            borderRadius: 3,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Confirmar
        </div>
      </div>

      {/* Mini gift card */}
      <div className="px-2 pb-2">
        <div
          className="rounded-sm px-1.5 py-1 flex items-center gap-1.5"
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
          }}
        >
          <div
            className="rounded-sm shrink-0"
            style={{ width: 14, height: 14, background: t.accent, opacity: 0.85 }}
          />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 6.5, fontWeight: 600, lineHeight: 1.1 }}>Lista de Presentes</div>
            <div style={{ fontSize: 5.5, opacity: 0.6, lineHeight: 1.2 }}>
              Cotas · PIX · Tradicional
            </div>
          </div>
          <div
            style={{
              fontSize: 5.5,
              padding: "1px 4px",
              border: `1px solid ${t.primary}`,
              color: t.primary,
              borderRadius: 2,
            }}
          >
            Ver
          </div>
        </div>
      </div>
    </div>
  );
}
