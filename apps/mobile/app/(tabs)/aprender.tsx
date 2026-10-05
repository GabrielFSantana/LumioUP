import { EmptyState, Screen } from '../../src/components/ui';

export default function AprenderScreen() {
  return (
    <Screen title="Aprender">
      <EmptyState
        title="Em breve: trilhas de aprendizado"
        hint="Conteúdos educativos curtos sobre orçamento, reserva de emergência e muito mais. Conteúdo educativo, sem recomendação de investimentos."
      />
    </Screen>
  );
}
