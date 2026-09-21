// Limite conhecido (documentado no README): o app ainda não guarda o
// timezone de cada usuário, então "hoje" é definido pelo relógio UTC do
// servidor, igual para todo mundo — não é o ideal (um usuário no Brasil às
// 22h já estaria "amanhã" em UTC), mas é uma decisão consciente até existir
// timezone por usuário.
//
// O que ESTE arquivo resolve é um bug diferente e real: antes, partes do
// código calculavam o início do dia com `setHours` (horário LOCAL do
// processo Node) e comparavam com strings de data extraídas via
// `toISOString()` (sempre UTC) — os dois relógios discordavam entre si
// sempre que o servidor não roda em UTC+0, fazendo um registro "sumir" do
// dia mesmo tendo acabado de ser criado. Centralizar em UTC dos dois lados
// elimina essa contradição interna, independente de qual fuso o processo
// Node está rodando.
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
