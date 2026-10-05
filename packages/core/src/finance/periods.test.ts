import {
  daysInPeriod,
  formatPeriodLabel,
  periodFor,
  previousLabel,
  previousPeriod,
  sampleDates,
  shiftAnchor,
  shiftCustomPeriod,
  weekdayOf,
} from './periods';

describe('weekdayOf e daysInPeriod', () => {
  it('dia da semana (0 = domingo)', () => {
    expect(weekdayOf('2026-10-04')).toBe(0); // domingo
    expect(weekdayOf('2026-10-05')).toBe(1); // segunda
    expect(weekdayOf('2026-10-10')).toBe(6); // sábado
  });
  it('conta dias com as duas pontas', () => {
    expect(daysInPeriod({ from: '2026-10-01', to: '2026-10-01' })).toBe(1);
    expect(daysInPeriod({ from: '2026-10-01', to: '2026-10-31' })).toBe(31);
    expect(daysInPeriod({ from: '2024-02-01', to: '2024-02-29' })).toBe(29);
    expect(daysInPeriod({ from: '2026-12-30', to: '2027-01-02' })).toBe(4);
  });
});

describe('periodFor', () => {
  it('dia', () => {
    expect(periodFor('day', '2026-10-05')).toEqual({ from: '2026-10-05', to: '2026-10-05' });
  });
  it('semana de domingo a sábado', () => {
    expect(periodFor('week', '2026-10-05')).toEqual({ from: '2026-10-04', to: '2026-10-10' });
    expect(periodFor('week', '2026-10-04')).toEqual({ from: '2026-10-04', to: '2026-10-10' });
    expect(periodFor('week', '2026-10-10')).toEqual({ from: '2026-10-04', to: '2026-10-10' });
  });
  it('semana que atravessa o mês e o ano', () => {
    expect(periodFor('week', '2026-12-31')).toEqual({ from: '2026-12-27', to: '2027-01-02' });
  });
  it('mês e ano', () => {
    expect(periodFor('month', '2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodFor('year', '2026-10-05')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
  it('personalizado usa o período informado', () => {
    const custom = { from: '2026-10-01', to: '2026-10-15' };
    expect(periodFor('custom', '2026-10-05', custom)).toEqual(custom);
    expect(periodFor('custom', '2026-10-05')).toEqual({ from: '2026-10-05', to: '2026-10-05' });
  });
});

describe('shiftAnchor', () => {
  it('avança e volta por tipo', () => {
    expect(shiftAnchor('day', '2026-10-05', 1)).toBe('2026-10-06');
    expect(shiftAnchor('week', '2026-10-05', -1)).toBe('2026-09-28');
    expect(shiftAnchor('month', '2026-10-15', 1)).toBe('2026-11-01');
    expect(shiftAnchor('year', '2026-10-05', -1)).toBe('2025-01-01');
  });
});

describe('shiftCustomPeriod', () => {
  it('desloca pelo tamanho do período', () => {
    const p = { from: '2026-10-01', to: '2026-10-10' };
    expect(shiftCustomPeriod(p, 1)).toEqual({ from: '2026-10-11', to: '2026-10-20' });
    expect(shiftCustomPeriod(p, -1)).toEqual({ from: '2026-09-21', to: '2026-09-30' });
  });
});

describe('previousPeriod', () => {
  it('dia e semana', () => {
    expect(previousPeriod('day', { from: '2026-10-05', to: '2026-10-05' })).toEqual({
      from: '2026-10-04',
      to: '2026-10-04',
    });
    expect(previousPeriod('week', { from: '2026-10-04', to: '2026-10-10' })).toEqual({
      from: '2026-09-27',
      to: '2026-10-03',
    });
  });
  it('mês usa o mês de calendário anterior, mesmo com tamanhos diferentes', () => {
    expect(previousPeriod('month', { from: '2026-03-01', to: '2026-03-31' })).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(previousPeriod('month', { from: '2026-01-01', to: '2026-01-31' })).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });
  it('ano', () => {
    expect(previousPeriod('year', { from: '2026-01-01', to: '2026-12-31' })).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    });
  });
  it('personalizado: mesmo número de dias imediatamente antes', () => {
    expect(previousPeriod('custom', { from: '2026-10-11', to: '2026-10-20' })).toEqual({
      from: '2026-10-01',
      to: '2026-10-10',
    });
  });
});

describe('formatPeriodLabel e previousLabel', () => {
  const today = '2026-10-05';
  it('rótulos por tipo', () => {
    expect(formatPeriodLabel('day', { from: today, to: today }, today)).toBe('Hoje');
    expect(formatPeriodLabel('day', { from: '2026-10-03', to: '2026-10-03' }, today)).toBe(
      '03/10/2026',
    );
    expect(formatPeriodLabel('week', { from: '2026-10-04', to: '2026-10-10' }, today)).toBe(
      '04/10 a 10/10',
    );
    expect(formatPeriodLabel('month', { from: '2026-10-01', to: '2026-10-31' }, today)).toBe(
      'Outubro de 2026',
    );
    expect(formatPeriodLabel('year', { from: '2026-01-01', to: '2026-12-31' }, today)).toBe('2026');
    expect(formatPeriodLabel('custom', { from: '2026-10-01', to: '2026-10-15' }, today)).toBe(
      '01/10/2026 a 15/10/2026',
    );
  });
  it('texto de comparação', () => {
    expect(previousLabel('month')).toBe('mês anterior');
    expect(previousLabel('custom')).toBe('período anterior');
  });
});

describe('sampleDates', () => {
  it('período no futuro não gera pontos', () => {
    expect(sampleDates({ from: '2026-11-01', to: '2026-11-30' }, '2026-10-05')).toEqual([]);
  });
  it('um único dia gera um ponto', () => {
    expect(sampleDates({ from: '2026-10-05', to: '2026-10-05' }, '2026-10-05')).toEqual([
      '2026-10-05',
    ]);
  });
  it('limita ao dia de hoje e inclui as duas pontas', () => {
    const dates = sampleDates({ from: '2026-10-01', to: '2026-10-31' }, '2026-10-15');
    expect(dates[0]).toBe('2026-10-01');
    expect(dates[dates.length - 1]).toBe('2026-10-15');
    expect(dates.length).toBeLessThanOrEqual(12);
  });
  it('períodos curtos usam um ponto por dia', () => {
    expect(sampleDates({ from: '2026-10-04', to: '2026-10-10' }, '2026-12-01')).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ]);
  });
  it('ano inteiro gera no máximo 12 pontos crescentes', () => {
    const dates = sampleDates({ from: '2026-01-01', to: '2026-12-31' }, '2026-12-31');
    expect(dates).toHaveLength(12);
    expect([...dates].sort()).toEqual(dates);
    expect(dates[11]).toBe('2026-12-31');
  });
});
