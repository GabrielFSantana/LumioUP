import { describeXpGain, levelFor, levelProgress, type Level } from './levels';

const levels: Level[] = [
  { level: 1, name: 'Curioso Financeiro', minXp: 0 },
  { level: 2, name: 'Organizador', minXp: 100 },
  { level: 3, name: 'Poupador', minXp: 250 },
];

describe('levelFor', () => {
  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [249, 2],
    [250, 3],
    [999999, 3],
  ])('%i XP -> nível %i', (xp, level) => {
    expect(levelFor(xp, levels).level).toBe(level);
  });

  it('XP negativo ou fracionário não quebra', () => {
    expect(levelFor(-50, levels).level).toBe(1);
    expect(levelFor(100.9, levels).level).toBe(2);
  });

  it('não depende da ordem em que os níveis chegam', () => {
    expect(levelFor(150, [...levels].reverse()).level).toBe(2);
  });

  it('sem níveis devolve um nível padrão', () => {
    expect(levelFor(500, []).level).toBe(1);
  });
});

describe('levelProgress', () => {
  it('no início do nível', () => {
    const p = levelProgress(0, levels);
    expect(p).toMatchObject({
      xpIntoLevel: 0,
      xpForLevel: 100,
      xpToNext: 100,
      percent: 0,
      isMax: false,
    });
    expect(p.next?.name).toBe('Organizador');
  });

  it('no meio do nível', () => {
    const p = levelProgress(175, levels);
    expect(p.current.level).toBe(2);
    expect(p).toMatchObject({ xpIntoLevel: 75, xpForLevel: 150, xpToNext: 75, percent: 50 });
  });

  it('um XP antes do próximo nível mostra 99%, nunca 100%', () => {
    expect(levelProgress(99, levels).percent).toBe(99);
    expect(levelProgress(249, levels).percent).toBe(99);
  });

  it('ao alcançar o nível a barra reinicia', () => {
    const p = levelProgress(100, levels);
    expect(p.current.level).toBe(2);
    expect(p.percent).toBe(0);
  });

  it('último nível: sem próximo, barra cheia', () => {
    const p = levelProgress(400, levels);
    expect(p).toMatchObject({
      isMax: true,
      next: null,
      xpToNext: null,
      xpForLevel: null,
      percent: 100,
    });
    expect(p.xpIntoLevel).toBe(150);
  });
});

describe('describeXpGain', () => {
  it('formata o ganho', () => {
    expect(describeXpGain(10)).toBe('+10 XP');
    expect(describeXpGain(0)).toBe('+0 XP');
    expect(describeXpGain(-5)).toBe('+0 XP');
  });
});
