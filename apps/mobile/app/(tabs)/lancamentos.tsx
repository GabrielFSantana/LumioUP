import { EmptyState, Screen } from '../../src/components/ui';

export default function LancamentosScreen() {
  return (
    <Screen title="Lançamentos">
      <EmptyState
        title="Nenhum lançamento ainda"
        hint="Registre sua primeira receita ou gasto. Leva poucos segundos."
      />
    </Screen>
  );
}
