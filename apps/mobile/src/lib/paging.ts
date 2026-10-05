/**
 * O servidor devolve no máximo 1.000 linhas por consulta (limite do PostgREST) e cortaria o
 * restante sem avisar. Por isso toda busca de lista é feita em páginas até acabar.
 */
export const PAGE_SIZE = 1000;
/** Teto de segurança: 50.000 linhas. Acima disso é hora de agregar no banco. */
const MAX_PAGES = 50;

interface PageResponse<Row> {
  data: Row[] | null;
  error: { message: string; code?: string } | null;
}

export async function fetchAllPages<Row>(
  page: (from: number, to: number) => PromiseLike<PageResponse<Row>>,
  fail: (error: { message: string; code?: string }) => never,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
    if (error) fail(error);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }
  return rows;
}
