/** Aviso exibido na área de conteúdo: o app é educativo e não recomenda investimentos. */
export const EDUCATION_DISCLAIMER =
  'Conteúdo educativo e informativo. Não é recomendação de compra ou venda de investimentos nem orientação personalizada.';

/** Mesma nota mínima aplicada pelo banco (60%): 2 de 3 perguntas aprovam o quiz. */
export const QUIZ_PASS_PCT = 60;

export type ArticleBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

/**
 * Converte o texto do artigo em blocos: parágrafos separados por linha em branco,
 * "## " para subtítulo e linhas começando com "- " para listas.
 */
export function parseArticleBody(body: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const chunks = body.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  for (const raw of chunks) {
    const chunk = raw.trim();
    if (chunk === '') continue;
    const lines = chunk.split('\n').map((line) => line.trim());
    let paragraph: string[] = [];
    let list: string[] = [];
    const flushParagraph = () => {
      if (paragraph.length > 0) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    };
    const flushList = () => {
      if (list.length > 0) blocks.push({ type: 'list', items: list });
      list = [];
    };
    for (const line of lines) {
      if (line.startsWith('## ')) {
        flushParagraph();
        flushList();
        blocks.push({ type: 'heading', text: line.slice(3).trim() });
      } else if (line.startsWith('- ')) {
        flushParagraph();
        list.push(line.slice(2).trim());
      } else {
        flushList();
        paragraph.push(line);
      }
    }
    flushParagraph();
    flushList();
  }
  return blocks;
}

export function readingTimeLabel(minutes: number): string {
  return `${minutes} min de leitura`;
}

/** Percentual inteiro de acertos (arredonda para baixo, como o servidor). */
export function quizPercent(correct: number, total: number): number {
  if (total <= 0 || correct <= 0) return 0;
  return Math.min(100, Math.floor((correct * 100) / total));
}

export function isQuizPassed(correct: number, total: number): boolean {
  return quizPercent(correct, total) >= QUIZ_PASS_PCT;
}

export interface TrackProgress {
  done: number;
  total: number;
  percent: number;
  completed: boolean;
  /** Primeiro artigo ainda não lido, na ordem da trilha. */
  nextSlug: string | null;
}

/** Progresso na trilha: artigos lidos entre os da trilha (na ordem). */
export function trackProgress(
  orderedSlugs: string[],
  completed: ReadonlySet<string>,
): TrackProgress {
  const total = orderedSlugs.length;
  const done = orderedSlugs.filter((slug) => completed.has(slug)).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.floor((done * 100) / total),
    completed: total > 0 && done === total,
    nextSlug: orderedSlugs.find((slug) => !completed.has(slug)) ?? null,
  };
}

/** Texto sem acentos e em minúsculas, para buscar sem se preocupar com grafia. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

/** Filtra o glossário por termo ou definição e devolve em ordem alfabética (pt-BR). */
export function searchGlossary<T extends GlossaryTerm>(terms: readonly T[], query: string): T[] {
  const q = normalizeSearch(query);
  return terms
    .filter(
      (item) =>
        q === '' ||
        normalizeSearch(item.term).includes(q) ||
        normalizeSearch(item.definition).includes(q),
    )
    .slice()
    .sort((a, b) => a.term.localeCompare(b.term, 'pt-BR'));
}
