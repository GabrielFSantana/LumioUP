import { buildInsights, categoryChanges, formatPercent, topCategories } from './insights';
import { summarize } from './summary';
import type { Transaction } from './types';

const exp = (amountCents: number, categoryId: string): Transaction => ({
  kind: 'expense',
  amountCents,
  occurredOn: '2026-10-05',
  categoryId,
});

describe('topCategories', () => {
  const items = [
    exp(5000, 'a'),
    exp(3000, 'b'),
    exp(1000, 'c'),
    exp(500, 'd'),
    exp(500, 'e'),
    {
      kind: 'income',
      amountCents: 99999,
      occurredOn: '2026-10-05',
      categoryId: 'x',
    } as Transaction,
  ];
  it('separa as maiores e agrupa o resto em "outras"', () => {
    const r = topCategories(items, 'expense', 3);
    expect(r.top.map((c) => c.categoryId)).toEqual(['a', 'b', 'c']);
    expect(r.otherCents).toBe(1000);
    expect(r.otherPercent).toBe(10);
  });
  it('sem excedente, "outras" é zero', () => {
    const r = topCategories(items, 'expense', 10);
    expect(r.top).toHaveLength(5);
    expect(r.otherCents).toBe(0);
    expect(r.otherPercent).toBe(0);
  });
  it('lista vazia', () => {
    expect(topCategories([], 'expense')).toEqual({ top: [], otherCents: 0, otherPercent: 0 });
  });
});

describe('categoryChanges', () => {
  const previous = [exp(10000, 'food'), exp(2000, 'fun'), exp(500, 'gone')];
  const current = [exp(11800, 'food'), exp(1000, 'fun'), exp(9999, 'new')];
  it('calcula variação por categoria com base no período anterior', () => {
    const changes = categoryChanges(current, previous, 'expense');
    const food = changes.find((c) => c.categoryId === 'food');
    expect(food?.changePercent).toBe(18);
    expect(changes.find((c) => c.categoryId === 'fun')?.changePercent).toBe(-50);
  });
  it('categoria que sumiu cai 100%; categoria nova não tem base e fica de fora', () => {
    const changes = categoryChanges(current, previous, 'expense');
    expect(changes.find((c) => c.categoryId === 'gone')?.changePercent).toBe(-100);
    expect(changes.find((c) => c.categoryId === 'new')).toBeUndefined();
  });
  it('ordena pela maior diferença em valor', () => {
    const changes = categoryChanges(current, previous, 'expense');
    expect(changes[0]?.categoryId).toBe('food');
  });
});

describe('formatPercent', () => {
  it.each([
    [18, '18'],
    [18.5, '18,5'],
    [2.55, '2,6'],
    [0, '0'],
  ])('%p', (value, expected) => {
    expect(formatPercent(value)).toBe(expected);
  });
});

describe('buildInsights', () => {
  const names: Record<string, string> = { food: 'Alimentação', fun: 'Lazer' };
  const categoryName = (id: string | null) => (id ? names[id] : undefined);
  const base = {
    categoryName,
    previousLabel: 'mês anterior',
  };
  const income = (cents: number): Transaction => ({
    kind: 'income',
    amountCents: cents,
    occurredOn: '2026-10-05',
  });
  const invest = (cents: number): Transaction => ({
    kind: 'investment',
    amountCents: cents,
    occurredOn: '2026-10-05',
  });

  it('gera a frase da categoria com maior variação', () => {
    const previous = [exp(10000, 'food')];
    const current = [exp(11800, 'food')];
    const sentences = buildInsights({
      ...base,
      current: summarize(current),
      previous: summarize(previous),
      expenseChanges: categoryChanges(current, previous, 'expense'),
    });
    expect(sentences[0]).toBe(
      'Seus gastos com Alimentação aumentaram 18% em relação ao mês anterior.',
    );
  });

  it('usa "diminuíram" quando cai', () => {
    const previous = [exp(10000, 'fun')];
    const current = [exp(7500, 'fun')];
    const sentences = buildInsights({
      ...base,
      current: summarize(current),
      previous: summarize(previous),
      expenseChanges: categoryChanges(current, previous, 'expense'),
    });
    expect(sentences[0]).toContain('diminuíram 25%');
  });

  it('ignora variações pequenas em valor ou em percentual', () => {
    const previous = [exp(500, 'food'), exp(100000, 'fun')];
    const current = [exp(900, 'food'), exp(101000, 'fun')];
    const sentences = buildInsights({
      ...base,
      current: summarize(current),
      previous: summarize(previous),
      expenseChanges: categoryChanges(current, previous, 'expense'),
    });
    expect(sentences.some((s) => s.includes('Alimentação'))).toBe(false);
    expect(sentences.some((s) => s.includes('Lazer'))).toBe(false);
  });

  it('sem categoria relevante, comenta o total quando varia 5% ou mais', () => {
    const previous = [exp(10000, 'zzz')];
    const current = [exp(11000, 'zzz')];
    const sentences = buildInsights({
      ...base,
      current: summarize(current),
      previous: summarize(previous),
      expenseChanges: categoryChanges(current, previous, 'expense'),
    });
    expect(sentences[0]).toBe('Seus gastos totais aumentaram 10% em relação ao mês anterior.');
  });

  it('comenta o percentual investido da renda e limita a 2 frases', () => {
    const previous = [exp(10000, 'food')];
    const current = [exp(11800, 'food'), income(100000), invest(15000)];
    const sentences = buildInsights({
      ...base,
      current: summarize(current),
      previous: summarize(previous),
      expenseChanges: categoryChanges(current, previous, 'expense'),
    });
    expect(sentences).toHaveLength(2);
    expect(sentences[1]).toBe('Você investiu 15% da sua renda neste período.');
  });

  it('sem dados não gera frases e nunca inventa comparação sem base', () => {
    const empty = summarize([]);
    expect(buildInsights({ ...base, current: empty, previous: empty, expenseChanges: [] })).toEqual(
      [],
    );
    const current = [exp(5000, 'food')];
    expect(
      buildInsights({
        ...base,
        current: summarize(current),
        previous: empty,
        expenseChanges: [],
      }),
    ).toEqual([]);
  });
});
