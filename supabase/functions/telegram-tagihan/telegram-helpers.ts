const TELEGRAM_API = 'https://api.telegram.org/bot'
const EMPTY_REPORT_PATTERN = /tidak ada/i

export async function sendMessage(token: string, chatId: number | string, text: string, parseMode = 'HTML') {
  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode, disable_web_page_preview: true }),
  })
  const payload = await res.json().catch(() => ({ ok: false, description: 'Invalid Telegram response' }))
  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.description || 'Telegram sendMessage failed')
  }
  return payload
}

export function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function isValidChatId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Math.abs(value) > 0 && Math.abs(value) < 10_000_000_000_000_000
}

export function normalizeChatId(value: unknown): number | null {
  const chatId = Number(value)
  return isValidChatId(chatId) ? chatId : null
}

export function shouldSendReport(report: string) {
  return !EMPTY_REPORT_PATTERN.test(report)
}

export function isMonthlyReportDue(subscription: any, today: Date) {
  const reportDate = Number(subscription.monthly_report_date || 1)
  const safeDate = Number.isInteger(reportDate) ? Math.min(Math.max(reportDate, 1), 28) : 1
  return today.getDate() === safeDate
}
