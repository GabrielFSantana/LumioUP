import { describeXpGain } from '@lumioup/core';
import { useEffect, useRef } from 'react';
import { useToast } from '../../components/ui';
import { useAchievements, useMissions, useUserStats } from './hooks';

/** Espera as consultas assentarem antes de mostrar um único aviso combinado. */
const SETTLE_MS = 700;

interface Pending {
  xp: number;
  achievements: string[];
  missions: string[];
}

/**
 * Mostra um aviso único com o que acabou de acontecer: "+N XP", missão concluída e/ou conquista
 * desbloqueada. A primeira leitura de cada lista só guarda o estado (sem aviso), para não
 * comemorar o que já existia ao abrir o app. Quando um limite diário é atingido nada é mostrado:
 * o app nunca avisa sobre XP que "deixou de ganhar".
 */
export function XpWatcher() {
  const toast = useToast();
  const { data: stats } = useUserStats();
  const { items: achievements, isLoading: loadingAchievements } = useAchievements();
  const { rows: missions, isLoading: loadingMissions } = useMissions();

  const pending = useRef<Pending>({ xp: 0, achievements: [], missions: [] });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevXp = useRef<number | null>(null);
  const prevAchievements = useRef<Set<string> | null>(null);
  const prevMissions = useRef<Set<string> | null>(null);

  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { xp, achievements: a, missions: m } = pending.current;
      pending.current = { xp: 0, achievements: [], missions: [] };
      const parts = [
        ...m.map((title) => `Missão concluída: ${title}`),
        ...a.map((name) => `Conquista: ${name}`),
      ];
      if (xp > 0) parts.push(describeXpGain(xp));
      if (parts.length > 0) toast.show({ message: parts.join(' · ') });
    }, SETTLE_MS);
  };

  const total = stats?.totalXp;
  useEffect(() => {
    if (total === undefined) return;
    if (prevXp.current !== null && total > prevXp.current) {
      pending.current.xp += total - prevXp.current;
      schedule();
    }
    prevXp.current = total;
  }, [total]);

  const unlockedKey = achievements
    .filter((a) => a.unlocked)
    .map((a) => a.code)
    .join(',');
  useEffect(() => {
    // Só compara depois que catálogo e desbloqueadas terminaram de carregar.
    if (loadingAchievements || achievements.length === 0) return;
    const current = new Set(achievements.filter((a) => a.unlocked).map((a) => a.code));
    if (prevAchievements.current !== null) {
      for (const a of achievements) {
        if (current.has(a.code) && !prevAchievements.current.has(a.code)) {
          pending.current.achievements.push(a.name);
        }
      }
      if (pending.current.achievements.length > 0) schedule();
    }
    prevAchievements.current = current;
  }, [unlockedKey, achievements.length, loadingAchievements]);

  const completedKey = missions
    .filter((r) => r.completed)
    .map((r) => r.template.code)
    .join(',');
  useEffect(() => {
    if (loadingMissions || missions.length === 0) return;
    const current = new Set(missions.filter((r) => r.completed).map((r) => r.template.code));
    if (prevMissions.current !== null) {
      for (const r of missions) {
        if (current.has(r.template.code) && !prevMissions.current.has(r.template.code)) {
          pending.current.missions.push(r.template.title);
        }
      }
      if (pending.current.missions.length > 0) schedule();
    }
    prevMissions.current = current;
  }, [completedKey, missions.length, loadingMissions]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return null;
}
