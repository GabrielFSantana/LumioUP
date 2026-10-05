import type { CategoryColor, GoalKind } from '@lumioup/core';

/** Ícone (Ionicons) de cada tipo de meta. */
export const GOAL_ICONS: Record<GoalKind, string> = {
  emergency: 'shield-checkmark-outline',
  save: 'cash-outline',
  debt: 'card-outline',
  trip: 'airplane-outline',
  purchase: 'bag-handle-outline',
  invest_monthly: 'trending-up-outline',
  spending_limit: 'speedometer-outline',
};

/** Cor (chave de categoria) de cada tipo de meta. */
export const GOAL_COLORS: Record<GoalKind, CategoryColor> = {
  emergency: 'green',
  save: 'teal',
  debt: 'slate',
  trip: 'blue',
  purchase: 'pink',
  invest_monthly: 'amber',
  spending_limit: 'coral',
};

/** Nome sugerido ao escolher o tipo, enquanto o usuário não digitou o próprio. */
export const GOAL_DEFAULT_NAMES: Record<GoalKind, string> = {
  emergency: 'Reserva de emergência',
  save: 'Minha economia',
  debt: 'Quitar dívida',
  trip: 'Minha viagem',
  purchase: 'Meu objetivo',
  invest_monthly: 'Investir todo mês',
  spending_limit: 'Limite do mês',
};
