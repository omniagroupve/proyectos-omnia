// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE DE TELEGRAM
// ═══════════════════════════════════════════════════════════════════════════
// Bot API pura, sin SDK. Son cuatro llamadas HTTP: meter una dependencia de
// 2 MB para esto no tiene sentido.
//
// Alta del bot:  habla con @BotFather → /newbot → copia el token
// Webhook:       https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>&secret_token=<SECRET>

const API = "https://api.telegram.org";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Falta TELEGRAM_BOT_TOKEN");
  return t;
}

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result as T;
}

/** Escapa los caracteres reservados de MarkdownV2. Olvidarlo rompe el envío. */
export function esc(s: string): string {
  return s.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  opts: { buttons?: { text: string; url: string }[][]; silent?: boolean } = {}
) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true,
    disable_notification: opts.silent ?? false,
    ...(opts.buttons ? { reply_markup: { inline_keyboard: opts.buttons } } : {}),
  });
}

/** Expulsa y desbloquea: al caducar la suscripción hay que sacar del canal. */
export async function removeFromChat(chatId: string, userId: number) {
  await call("banChatMember", { chat_id: chatId, user_id: userId });
  await call("unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true });
}

export async function createInviteLink(chatId: string, expiresInMinutes = 30) {
  return call<{ invite_link: string }>("createChatInviteLink", {
    chat_id: chatId,
    expire_date: Math.floor(Date.now() / 1000) + expiresInMinutes * 60,
    member_limit: 1,   // un solo uso: sin esto el enlace circula por WhatsApp
  });
}

export async function setWebhook(url: string, secret: string) {
  return call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "chat_member"],
  });
}

// ─── Formateo de picks ─────────────────────────────────────────────────────

export interface PickMessage {
  sport: string;
  home: string;
  away: string;
  commenceTime: string;
  market: string;
  selection: string;
  line: number | null;
  odds: number;
  book: string;
  edge: number;
  stake: number;
  confidence: number;
  rationale?: string | null;
}

const MARKET_ES: Record<string, string> = {
  h2h: "Ganador",
  spreads: "Hándicap",
  totals: "Total",
  props: "Prop",
};

export function formatPick(p: PickMessage, delayed = false): string {
  const line = p.line !== null ? ` ${p.line > 0 ? "+" : ""}${p.line}` : "";
  const stars = "⭐".repeat(p.confidence);
  const hora = new Date(p.commenceTime).toLocaleString("es", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  const head = delayed ? "📊 *PICK \\(diferido 3h\\)*" : "🎯 *NUEVO PICK*";

  return [
    head,
    "",
    `*${esc(p.home)} vs ${esc(p.away)}*`,
    `${esc(p.sport)} · ${esc(hora)}`,
    "",
    `▸ ${esc(MARKET_ES[p.market] ?? p.market)}: *${esc(p.selection + line)}*`,
    `▸ Cuota: *${esc(p.odds.toFixed(2))}* en ${esc(p.book)}`,
    `▸ Valor: *\\+${esc(p.edge.toFixed(1))}%*`,
    `▸ Stake: *${esc(p.stake.toFixed(1))}u*`,
    `▸ Confianza: ${stars}`,
    ...(p.rationale ? ["", `_${esc(p.rationale.slice(0, 300))}_`] : []),
    "",
    delayed
      ? "⏱ Este pick se publicó hace 3 horas\\. La cuota ya se movió\\."
      : "⚡ Cuota verificada al publicar\\. Compruébala antes de apostar\\.",
    "",
    "\\+18 · Juega con responsabilidad",
  ].join("\n");
}

export function formatSettled(p: {
  home: string; away: string; selection: string;
  result: string; profitUnits: number; clv: number | null;
}): string {
  const icon = p.result === "win" ? "✅" : p.result === "loss" ? "❌" : "➖";
  const label = p.result === "win" ? "GANADO" : p.result === "loss" ? "PERDIDO" : "NULO";
  return [
    `${icon} *${esc(label)}* · ${esc(p.home)} vs ${esc(p.away)}`,
    `${esc(p.selection)} → *${esc((p.profitUnits > 0 ? "+" : "") + p.profitUnits.toFixed(2))}u*`,
    ...(p.clv !== null
      ? [`CLV: ${esc((p.clv > 0 ? "+" : "") + p.clv.toFixed(2))}%`]
      : []),
  ].join("\n");
}
