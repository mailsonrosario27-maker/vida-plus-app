import { z } from 'zod';
import { Response } from 'express';

// Paginação aditiva de propósito: o corpo da resposta continua sendo o
// array puro que os clientes (mobile/admin) já esperam — nada quebra hoje,
// com poucas dezenas de registros. `page`/`limit` na query e os metadados
// em headers (`X-Total-Count` etc.) ficam prontos pra quando o catálogo
// crescer, sem precisar reescrever nenhum client agora. Mudar pra um
// envelope `{ data, meta }` no corpo é a evolução natural quando algum
// client precisar consumir os metadados de verdade — não antes.
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function setPaginationHeaders(res: Response, pagination: Pagination, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pagination.limit));
  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(pagination.page));
  res.set('X-Limit', String(pagination.limit));
  res.set('X-Total-Pages', String(totalPages));
}
