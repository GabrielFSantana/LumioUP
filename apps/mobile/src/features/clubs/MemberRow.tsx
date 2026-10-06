import { CLUB_ROLE_LABELS, memberActions, type ClubRole, type MemberAction } from '@lumioup/core';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, ConfirmButton, Text } from '../../components/ui';
import { spacing } from '../../theme';
import type { ClubMember } from './api';

interface MemberRowProps {
  member: ClubMember;
  /** Papel de quem está olhando a lista. */
  actorRole: ClubRole;
  isSelf: boolean;
  busy: boolean;
  onAction: (action: MemberAction, member: ClubMember) => void;
}

const LABELS: Record<MemberAction, { label: string; confirm: string }> = {
  promote: { label: 'Tornar admin', confirm: 'Toque de novo para tornar admin' },
  demote: { label: 'Remover de admin', confirm: 'Toque de novo para remover de admin' },
  transfer: { label: 'Passar a propriedade', confirm: 'Toque de novo: passar a propriedade' },
  remove: { label: 'Remover do clube', confirm: 'Toque de novo para remover' },
};

/** Membro do clube: nome, papel e (se a pessoa permitir) nível e XP. Nunca mostra valores em reais. */
export function MemberRow({ member, actorRole, isSelf, busy, onAction }: MemberRowProps) {
  const actions = memberActions(actorRole, member.role, isSelf);
  const showsRanking = member.level !== null;
  return (
    <Card>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyBold">
            {isSelf ? `${member.displayName} (você)` : member.displayName}
          </Text>
          <Text variant="caption">
            {showsRanking
              ? `Nível ${member.level} · ${member.totalXp ?? 0} XP`
              : 'Prefere não aparecer no ranking'}
          </Text>
        </View>
        <Chip label={CLUB_ROLE_LABELS[member.role]} />
      </View>
      {actions.map((action) => (
        <ConfirmButton
          key={action}
          label={LABELS[action].label}
          confirmLabel={LABELS[action].confirm}
          disabled={busy}
          onConfirm={() => onAction(action, member)}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
