import { EmptyState, Screen } from '../../src/components/ui';

export default function MetasScreen() {
  return (
    <Screen title="Metas">
      <EmptyState
        title="Defina sua primeira meta"
        hint="Reserva de emergência, viagem, quitar uma dívida: comece pelo que importa para você."
      />
    </Screen>
  );
}
