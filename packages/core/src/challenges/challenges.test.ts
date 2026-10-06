import { addDays } from '../finance';
import {
  canCreateChallenge,
  canDeleteChallenge,
  challengeDuration,
  challengeStatus,
  daysBetween,
  daysLeft,
  isIsoDate,
  progressLabel,
  progressPct,
  targetRange,
  validateChallenge,
  type ChallengeDraft,
} from './challenges';

const TODAY = '2026-10-06';
const draft = (over: Partial<ChallengeDraft> = {}): ChallengeDraft => ({
  kind: 'log_count',
  title: 'Dez dias de organização',
  startsOn: TODAY,
  endsOn: '2026-10-15',
  target: 5,
  ...over,
});

describe('datas', () => {
  it('valida o formato e datas reais', () => {
    expect(isIsoDate('2026-10-06')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('06/10/2026')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('soma dias atravessando mês e ano', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('conta dias entre datas e a duração inclusiva', () => {
    expect(daysBetween('2026-10-06', '2026-10-16')).toBe(10);
    expect(daysBetween('2026-10-16', '2026-10-06')).toBe(-10);
    expect(challengeDuration('2026-10-06', '2026-10-06')).toBe(1);
    expect(challengeDuration('2026-10-06', '2026-10-15')).toBe(10);
  });
});

describe('status e prazo', () => {
  it('identifica em breve, em andamento e encerrado', () => {
    expect(challengeStatus(TODAY, '2026-10-08', '2026-10-20')).toBe('upcoming');
    expect(challengeStatus(TODAY, '2026-10-06', '2026-10-20')).toBe('active');
    expect(challengeStatus(TODAY, '2026-10-01', '2026-10-06')).toBe('active');
    expect(challengeStatus(TODAY, '2026-10-01', '2026-10-05')).toBe('ended');
  });

  it('conta hoje nos dias restantes', () => {
    expect(daysLeft(TODAY, '2026-10-06')).toBe(1);
    expect(daysLeft(TODAY, '2026-10-15')).toBe(10);
    expect(daysLeft(TODAY, '2026-10-01')).toBe(0);
  });
});

describe('progresso', () => {
  it('calcula percentual inteiro entre 0 e 100', () => {
    expect(progressPct(3, 5)).toBe(60);
    expect(progressPct(1, 3)).toBe(33);
    expect(progressPct(5, 5)).toBe(100);
    expect(progressPct(9, 5)).toBe(100);
    expect(progressPct(0, 5)).toBe(0);
    expect(progressPct(-2, 5)).toBe(0);
    expect(progressPct(3, 0)).toBe(0);
  });

  it('monta o texto de progresso sem passar da meta', () => {
    expect(progressLabel('log_count', 3, 5)).toBe('3 de 5 lançamentos');
    expect(progressLabel('log_days', 9, 7)).toBe('7 de 7 dias');
    expect(progressLabel('goal_contributions', 1, 2)).toBe('1 de 2 contribuições');
  });
});

describe('validateChallenge', () => {
  it('aceita um desafio válido', () => {
    expect(validateChallenge(draft(), TODAY)).toBeNull();
  });

  it('exige título e respeita o limite', () => {
    expect(validateChallenge(draft({ title: '   ' }), TODAY)?.title).toBeDefined();
    expect(validateChallenge(draft({ title: 'x'.repeat(61) }), TODAY)?.title).toBeDefined();
    expect(validateChallenge(draft({ title: 'x'.repeat(60) }), TODAY)).toBeNull();
  });

  it('recusa datas inválidas, passadas, invertidas ou longas demais', () => {
    expect(validateChallenge(draft({ startsOn: 'ontem' }), TODAY)?.dates).toBeDefined();
    expect(validateChallenge(draft({ startsOn: '2026-10-05' }), TODAY)?.dates).toMatch(/passado/);
    expect(validateChallenge(draft({ endsOn: '2026-10-05' }), TODAY)?.dates).toMatch(/depois/);
    expect(validateChallenge(draft({ endsOn: addDays(TODAY, 90) }), TODAY)?.dates).toMatch(/90/);
    expect(validateChallenge(draft({ endsOn: addDays(TODAY, 89) }), TODAY)).toBeNull();
  });

  it('aplica a meta mínima de cada tipo', () => {
    expect(validateChallenge(draft({ kind: 'log_count', target: 4 }), TODAY)?.target).toBeDefined();
    expect(
      validateChallenge(draft({ kind: 'goal_contributions', target: 1 }), TODAY)?.target,
    ).toBeDefined();
    expect(validateChallenge(draft({ kind: 'goal_contributions', target: 2 }), TODAY)).toBeNull();
    expect(validateChallenge(draft({ kind: 'log_days', target: 2 }), TODAY)?.target).toBeDefined();
  });

  it('não deixa "dias organizados" passar da duração', () => {
    const base = { kind: 'log_days' as const, endsOn: '2026-10-10' };
    expect(validateChallenge(draft({ ...base, target: 5 }), TODAY)).toBeNull();
    expect(validateChallenge(draft({ ...base, target: 6 }), TODAY)?.target).toBeDefined();
  });

  it('recusa meta fracionada ou acima de 100', () => {
    expect(validateChallenge(draft({ target: 5.5 }), TODAY)?.target).toBeDefined();
    expect(validateChallenge(draft({ target: 101 }), TODAY)?.target).toBeDefined();
    expect(validateChallenge(draft({ target: 100 }), TODAY)).toBeNull();
  });

  it('acumula erros de campos diferentes', () => {
    const errors = validateChallenge(
      draft({ title: '', startsOn: '2026-10-01', target: 1 }),
      TODAY,
    );
    expect(Object.keys(errors ?? {}).sort()).toEqual(['dates', 'target', 'title']);
  });
});

describe('targetRange', () => {
  it('limita "dias organizados" pela duração', () => {
    expect(targetRange('log_days', 7)).toEqual({ min: 3, max: 7 });
    expect(targetRange('log_days', 90)).toEqual({ min: 3, max: 90 });
    expect(targetRange('log_count', 7)).toEqual({ min: 5, max: 100 });
  });
});

describe('permissões', () => {
  it('só dono e admin criam desafios', () => {
    expect(canCreateChallenge('owner')).toBe(true);
    expect(canCreateChallenge('admin')).toBe(true);
    expect(canCreateChallenge('member')).toBe(false);
  });

  it('dono, admin e criador podem apagar', () => {
    expect(canDeleteChallenge('member', false)).toBe(false);
    expect(canDeleteChallenge('member', true)).toBe(true);
    expect(canDeleteChallenge('admin', false)).toBe(true);
  });
});
