import { EmptyState, Screen } from '../../src/components/ui';

export default function ClubesScreen() {
  return (
    <Screen title="Clubes">
      <EmptyState
        title="Você ainda não está em um clube"
        hint="Crie um clube ou entre com um código para fazer desafios com amigos. Seus valores nunca aparecem para ninguém."
      />
    </Screen>
  );
}
