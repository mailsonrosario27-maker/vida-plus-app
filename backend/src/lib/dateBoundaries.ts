import { prisma } from './prisma';

// Fuso padrão para usuários que ainda não têm `profile.timezone` definido
// (contas criadas antes desta migração, ou perfil ainda não carregado). O
// público do VIDA+ é majoritariamente Brasil, então este é o fallback mais
// honesto — mas a fonte de verdade é sempre `profile.timezone`.
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

// Deslocamento (em minutos) entre o relógio local de `timeZone` e UTC, no
// instante `date`. Não depende de nenhuma lib externa — usa o suporte a IANA
// timezones já embutido no Intl do Node.
function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return (asUTC - date.getTime()) / 60000;
}

// Meia-noite de "hoje" no horário local de `timeZone`, como instante UTC.
// Ex.: 2026-09-20 00:00 em America/Sao_Paulo (UTC-3) vira 2026-09-20T03:00:00Z.
export function startOfTodayInTz(timeZone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date();
  const offsetMin = timeZoneOffsetMinutes(now, timeZone);
  const local = new Date(now.getTime() + offsetMin * 60000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offsetMin * 60000);
}

export function endOfTodayInTz(timeZone: string = DEFAULT_TIMEZONE): Date {
  return new Date(startOfTodayInTz(timeZone).getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function daysAgoInTz(days: number, timeZone: string = DEFAULT_TIMEZONE): Date {
  const start = startOfTodayInTz(timeZone);
  start.setUTCDate(start.getUTCDate() - days);
  return start;
}

// Chave "YYYY-MM-DD" de `date` no calendário local de `timeZone`.
export function dateKeyInTz(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function todayKeyInTz(timeZone: string = DEFAULT_TIMEZONE): string {
  return dateKeyInTz(new Date(), timeZone);
}

export async function resolveUserTimezone(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { timezone: true } });
  return profile?.timezone || DEFAULT_TIMEZONE;
}

// ------------------------------------------------------------------
// Variantes puramente UTC — mantidas para métricas agregadas globais
// (ex.: admin "usuários ativos nos últimos 30 dias") que não pertencem a um
// único usuário e não devem depender do fuso de ninguém em particular.
// ------------------------------------------------------------------

export function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export function daysAgoUTC(days: number): Date {
  const d = startOfTodayUTC();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export function dateKeyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayKeyUTC(): string {
  return dateKeyUTC(new Date());
}
