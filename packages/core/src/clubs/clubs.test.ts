import {
  CLUB_LIMITS,
  buildInviteLink,
  buildInviteMessage,
  canChangeRoles,
  canDeleteClub,
  canEditClub,
  canRegenerateCode,
  canRemoveMember,
  extractInviteCode,
  formatInviteCode,
  isValidInviteCode,
  leaveOutcome,
  memberActions,
  normalizeInviteCode,
  validateClubDescription,
  validateClubName,
} from './clubs';

describe('código de convite', () => {
  it('normaliza maiúsculas, hífens e espaços', () => {
    expect(normalizeInviteCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(normalizeInviteCode('ab cd_ef.gh')).toBe('ABCDEFGH');
  });

  it('valida o alfabeto (sem I, O, 0 e 1) e o tamanho', () => {
    expect(isValidInviteCode('ABCD-EFGH')).toBe(true);
    expect(isValidInviteCode('abcd2345')).toBe(true);
    expect(isValidInviteCode('ABCDEFG')).toBe(false); // curto
    expect(isValidInviteCode('ABCDEFGHJ')).toBe(false); // longo
    expect(isValidInviteCode('ABCDEFG0')).toBe(false); // zero
    expect(isValidInviteCode('ABCDEFGI')).toBe(false); // I
    expect(isValidInviteCode('ABCDEFG1')).toBe(false); // um
    expect(isValidInviteCode('ABCDEFGO')).toBe(false); // O
    expect(isValidInviteCode('')).toBe(false);
  });

  it('formata para exibição', () => {
    expect(formatInviteCode('abcdefgh')).toBe('ABCD-EFGH');
    expect(formatInviteCode('ABC')).toBe('ABC');
  });
});

describe('link e mensagem de convite', () => {
  it('monta e extrai o código do link', () => {
    const link = buildInviteLink('abcd-efgh');
    expect(link).toBe('lumioup://clube/entrar?codigo=ABCDEFGH');
    expect(extractInviteCode(link)).toBe('ABCDEFGH');
  });

  it('extrai de código digitado e de links com outros parâmetros', () => {
    expect(extractInviteCode('abcd-efgh')).toBe('ABCDEFGH');
    expect(extractInviteCode('https://exemplo.com/x?utm=1&codigo=abcd-efgh#topo')).toBe('ABCDEFGH');
  });

  it('retorna null para texto sem código válido', () => {
    expect(extractInviteCode('')).toBeNull();
    expect(extractInviteCode('oi, tudo bem?')).toBeNull();
    expect(extractInviteCode('lumioup://clube/entrar?codigo=ABC')).toBeNull();
  });

  it('a mensagem de convite tem só nome do clube e código', () => {
    const message = buildInviteMessage('Poupadores', 'ABCDEFGH');
    expect(message).toContain('Poupadores');
    expect(message).toContain('ABCD-EFGH');
    expect(message).toContain('lumioup://clube/entrar?codigo=ABCDEFGH');
    expect(message).not.toMatch(/R\$|saldo|valor/i);
  });
});

describe('validações', () => {
  it('nome do clube', () => {
    expect(validateClubName('Poupadores')).toBeNull();
    expect(validateClubName('   ')).not.toBeNull();
    expect(validateClubName('a'.repeat(CLUB_LIMITS.nameMaxLength))).toBeNull();
    expect(validateClubName('a'.repeat(CLUB_LIMITS.nameMaxLength + 1))).not.toBeNull();
  });
  it('descrição do clube', () => {
    expect(validateClubDescription('')).toBeNull();
    expect(validateClubDescription('a'.repeat(CLUB_LIMITS.descriptionMaxLength))).toBeNull();
    expect(
      validateClubDescription('a'.repeat(CLUB_LIMITS.descriptionMaxLength + 1)),
    ).not.toBeNull();
  });
});

describe('permissões por papel', () => {
  it('editar clube e renovar código: dono e admin', () => {
    expect(canEditClub('owner')).toBe(true);
    expect(canEditClub('admin')).toBe(true);
    expect(canEditClub('member')).toBe(false);
    expect(canRegenerateCode('admin')).toBe(true);
    expect(canRegenerateCode('member')).toBe(false);
  });

  it('papéis, transferência e exclusão: só o dono', () => {
    expect(canChangeRoles('owner')).toBe(true);
    expect(canChangeRoles('admin')).toBe(false);
    expect(canChangeRoles('member')).toBe(false);
    expect(canDeleteClub('owner')).toBe(true);
    expect(canDeleteClub('admin')).toBe(false);
  });

  it.each([
    ['owner', 'admin', true],
    ['owner', 'member', true],
    ['owner', 'owner', false],
    ['admin', 'member', true],
    ['admin', 'admin', false],
    ['admin', 'owner', false],
    ['member', 'member', false],
    ['member', 'admin', false],
    ['member', 'owner', false],
  ] as const)('%s remove %s -> %s', (actor, target, expected) => {
    expect(canRemoveMember(actor, target)).toBe(expected);
  });

  it('sair: dono sozinho apaga o clube; com outros precisa transferir', () => {
    expect(leaveOutcome('member', 5)).toBe('leave');
    expect(leaveOutcome('admin', 2)).toBe('leave');
    expect(leaveOutcome('owner', 1)).toBe('delete_club');
    expect(leaveOutcome('owner', 2)).toBe('must_transfer');
  });

  it('ações disponíveis na lista de membros', () => {
    expect(memberActions('owner', 'member', false)).toEqual(['promote', 'transfer', 'remove']);
    expect(memberActions('owner', 'admin', false)).toEqual(['demote', 'transfer', 'remove']);
    expect(memberActions('admin', 'member', false)).toEqual(['remove']);
    expect(memberActions('admin', 'admin', false)).toEqual([]);
    expect(memberActions('member', 'member', false)).toEqual([]);
  });

  it('ninguém age sobre si mesmo nem sobre o dono', () => {
    expect(memberActions('owner', 'owner', true)).toEqual([]);
    expect(memberActions('admin', 'member', true)).toEqual([]);
    expect(memberActions('owner', 'owner', false)).toEqual([]);
    expect(memberActions('admin', 'owner', false)).toEqual([]);
  });
});
