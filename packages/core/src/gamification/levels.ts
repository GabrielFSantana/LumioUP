export interface Level {
  level: number;
  name: string;
  /** XP total necessário para alcançar este nível. */
  minXp: number;
}

const FALLBACK_LEVEL: Level = { level: 1, name: '', minXp: 0 };

function sorted(levels: readonly Level[]): Level[] {
  return [...levels].sort((a, b) => a.minXp - b.minXp);
}

/** Nível correspondente ao XP total (o mais alto cujo mínimo foi alcançado). */
export function levelFor(xp: number, levels: readonly Level[]): Level {
  const safeXp = Math.max(0, Math.floor(xp));
  const ordered = sorted(levels);
  let current = ordered[0] ?? FALLBACK_LEVEL;
  for (const level of ordered) {
    if (level.minXp <= safeXp) current = level;
  }
  return current;
}

export interface LevelProgress {
  current: Level;
  /** Próximo nível; null no último. */
  next: Level | null;
  /** XP acumulado dentro do nível atual. */
  xpIntoLevel: number;
  /** Tamanho do nível atual em XP (null no último nível). */
  xpForLevel: number | null;
  /** XP que falta para o próximo nível (null no último). */
  xpToNext: number | null;
  /** 0 a 100, arredondado para baixo; 100 no último nível. */
  percent: number;
  isMax: boolean;
}

/** Progresso dentro do nível atual, para a barra de XP. */
export function levelProgress(xp: number, levels: readonly Level[]): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xp));
  const ordered = sorted(levels);
  const current = levelFor(safeXp, ordered);
  const next = ordered.find((l) => l.minXp > current.minXp) ?? null;
  const xpIntoLevel = safeXp - current.minXp;
  if (!next) {
    return {
      current,
      next: null,
      xpIntoLevel,
      xpForLevel: null,
      xpToNext: null,
      percent: 100,
      isMax: true,
    };
  }
  const xpForLevel = next.minXp - current.minXp;
  return {
    current,
    next,
    xpIntoLevel,
    xpForLevel,
    xpToNext: next.minXp - safeXp,
    percent: Math.min(99, Math.floor((xpIntoLevel / xpForLevel) * 100)),
    isMax: false,
  };
}

/** "+10 XP" */
export function describeXpGain(xp: number): string {
  return `+${Math.max(0, Math.round(xp))} XP`;
}
