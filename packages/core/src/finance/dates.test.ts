import {
  addDays,
  categoryKindFor,
  displaySign,
  formatBrDate,
  formatDayLabel,
  formatMonthLabel,
  groupByDay,
  matchesFilter,
  monthPeriod,
  parseBrDate,
  shiftMonth,
  toDateString,
} from './dates';

describe('toDateString', () => {
  it('usa a data local, sem converter para UTC', () => {
    expect(toDateString(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
    expect(toDateString(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('addDays', () => {
  it('atravessa mês e ano', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('respeita ano bissexto', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('monthPeriod', () => {
  it.each([
    ['2026-10-15', '2026-10-01', '2026-10-31'],
    ['2026-02-10', '2026-02-01', '2026-02-28'],
    ['2024-02-10', '2024-02-01', '2024-02-29'],
    ['2026-12-31', '2026-12-01', '2026-12-31'],
  ])('%s', (date, from, to) => {
    expect(monthPeriod(date)).toEqual({ from, to });
  });
});

describe('shiftMonth', () => {
  it('avança e volta meses', () => {
    expect(shiftMonth('2026-10-15', 1)).toBe('2026-11-01');
    expect(shiftMonth('2026-10-15', -1)).toBe('2026-09-01');
  });
  it('vira o ano nas duas direções', () => {
    expect(shiftMonth('2026-12-10', 1)).toBe('2027-01-01');
    expect(shiftMonth('2026-01-10', -1)).toBe('2025-12-01');
    expect(shiftMonth('2026-03-10', -14)).toBe('2025-01-01');
  });
});

describe('formatMonthLabel e formatBrDate', () => {
  it('formata em português', () => {
    expect(formatMonthLabel('2026-10-05')).toBe('outubro de 2026');
    expect(formatMonthLabel('2026-03-01')).toBe('março de 2026');
    expect(formatBrDate('2026-10-05')).toBe('05/10/2026');
  });
});

describe('parseBrDate', () => {
  it.each([
    ['05/10/2026', '2026-10-05'],
    ['5/1/2026', '2026-01-05'],
    [' 29/02/2024 ', '2024-02-29'],
  ])('aceita %s', (input, expected) => {
    expect(parseBrDate(input)).toBe(expected);
  });
  it.each(['', '29/02/2026', '31/04/2026', '10/13/2026', '2026-10-05', '05-10-2026', '5/10/26'])(
    'rejeita "%s"',
    (input) => {
      expect(parseBrDate(input)).toBeNull();
    },
  );
  it('ida e volta com formatBrDate', () => {
    expect(parseBrDate(formatBrDate('2026-10-05'))).toBe('2026-10-05');
  });
});

describe('formatDayLabel', () => {
  const today = '2026-10-05'; // segunda-feira
  it('Hoje e Ontem', () => {
    expect(formatDayLabel('2026-10-05', today)).toBe('Hoje');
    expect(formatDayLabel('2026-10-04', today)).toBe('Ontem');
  });
  it('dia da semana e data para os demais', () => {
    expect(formatDayLabel('2026-10-02', today)).toBe('sexta-feira, 02/10');
    expect(formatDayLabel('2026-10-06', today)).toBe('terça-feira, 06/10');
  });
});

describe('groupByDay', () => {
  const items = [
    { occurredOn: '2026-10-03', id: 'a' },
    { occurredOn: '2026-10-05', id: 'b' },
    { occurredOn: '2026-10-03', id: 'c' },
    { occurredOn: '2026-10-05', id: 'd' },
  ];
  it('agrupa por dia, do mais recente ao mais antigo, preservando a ordem interna', () => {
    const groups = groupByDay(items);
    expect(groups.map((g) => g.date)).toEqual(['2026-10-05', '2026-10-03']);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(['b', 'd']);
    expect(groups[1]?.items.map((i) => i.id)).toEqual(['a', 'c']);
  });
  it('lista vazia gera nenhum grupo', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('displaySign', () => {
  it.each([
    ['income', 1],
    ['redemption', 1],
    ['profit', 1],
    ['expense', -1],
    ['investment', -1],
    ['loss', -1],
    ['transfer', 0],
  ] as const)('%s', (kind, sign) => {
    expect(displaySign(kind)).toBe(sign);
  });
});

describe('categoryKindFor', () => {
  it('mapeia tipos de lançamento para tipos de categoria', () => {
    expect(categoryKindFor('expense')).toBe('expense');
    expect(categoryKindFor('income')).toBe('income');
    expect(categoryKindFor('investment')).toBe('investment');
    expect(categoryKindFor('redemption')).toBe('investment');
    expect(categoryKindFor('profit')).toBe('investment');
    expect(categoryKindFor('loss')).toBe('investment');
    expect(categoryKindFor('transfer')).toBeNull();
  });
});

describe('matchesFilter', () => {
  it('todos aceita qualquer tipo; os demais filtram', () => {
    expect(matchesFilter({ kind: 'income' }, 'all')).toBe(true);
    expect(matchesFilter({ kind: 'income' }, 'expense')).toBe(false);
    expect(matchesFilter({ kind: 'transfer' }, 'transfer')).toBe(true);
  });
});
