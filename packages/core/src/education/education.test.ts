import {
  EDUCATION_DISCLAIMER,
  QUIZ_PASS_PCT,
  isQuizPassed,
  normalizeSearch,
  parseArticleBody,
  quizPercent,
  readingTimeLabel,
  searchGlossary,
  trackProgress,
} from './education';

describe('parseArticleBody', () => {
  it('separa parágrafos, subtítulos e listas', () => {
    const body = [
      'Primeiro parágrafo.',
      '',
      '## Subtítulo',
      '',
      '- item um',
      '- item dois',
      '',
      'Segundo parágrafo.',
    ].join('\n');
    expect(parseArticleBody(body)).toEqual([
      { type: 'paragraph', text: 'Primeiro parágrafo.' },
      { type: 'heading', text: 'Subtítulo' },
      { type: 'list', items: ['item um', 'item dois'] },
      { type: 'paragraph', text: 'Segundo parágrafo.' },
    ]);
  });

  it('junta linhas seguidas em um parágrafo e aceita título colado na lista', () => {
    expect(parseArticleBody('linha um\nlinha dois')).toEqual([
      { type: 'paragraph', text: 'linha um linha dois' },
    ]);
    expect(parseArticleBody('## Título\n- a\n- b')).toEqual([
      { type: 'heading', text: 'Título' },
      { type: 'list', items: ['a', 'b'] },
    ]);
  });

  it('aceita quebras de linha do Windows e ignora espaços extras', () => {
    expect(parseArticleBody('Oi.\r\n\r\n   \r\n## Fim\r\n')).toEqual([
      { type: 'paragraph', text: 'Oi.' },
      { type: 'heading', text: 'Fim' },
    ]);
    expect(parseArticleBody('')).toEqual([]);
  });
});

describe('quiz', () => {
  it('calcula o percentual como o servidor', () => {
    expect(quizPercent(2, 3)).toBe(66);
    expect(quizPercent(3, 3)).toBe(100);
    expect(quizPercent(0, 3)).toBe(0);
    expect(quizPercent(1, 0)).toBe(0);
  });

  it('aprova com 60% ou mais', () => {
    expect(QUIZ_PASS_PCT).toBe(60);
    expect(isQuizPassed(2, 3)).toBe(true);
    expect(isQuizPassed(1, 3)).toBe(false);
    expect(isQuizPassed(3, 5)).toBe(true);
    expect(isQuizPassed(2, 5)).toBe(false);
  });
});

describe('trackProgress', () => {
  const slugs = ['a', 'b', 'c', 'd'];
  it('mostra o próximo artigo da trilha em ordem', () => {
    expect(trackProgress(slugs, new Set(['a', 'c']))).toEqual({
      done: 2,
      total: 4,
      percent: 50,
      completed: false,
      nextSlug: 'b',
    });
  });

  it('marca a trilha como concluída', () => {
    const progress = trackProgress(slugs, new Set(slugs));
    expect(progress.completed).toBe(true);
    expect(progress.nextSlug).toBeNull();
    expect(progress.percent).toBe(100);
  });

  it('ignora artigos lidos que não estão na trilha e trata trilha vazia', () => {
    expect(trackProgress(slugs, new Set(['x'])).done).toBe(0);
    expect(trackProgress([], new Set()).completed).toBe(false);
    expect(trackProgress([], new Set()).percent).toBe(0);
  });
});

describe('glossário', () => {
  const terms = [
    { term: 'Orçamento', definition: 'Plano para o uso do dinheiro.' },
    { term: 'Inflação', definition: 'Aumento geral dos preços.' },
    { term: 'Liquidez', definition: 'Facilidade de virar dinheiro.' },
  ];

  it('normaliza acentos e maiúsculas', () => {
    expect(normalizeSearch('  INFLAÇÃO ')).toBe('inflacao');
  });

  it('busca sem se importar com acentos, no termo ou na definição', () => {
    expect(searchGlossary(terms, 'inflacao').map((t) => t.term)).toEqual(['Inflação']);
    expect(searchGlossary(terms, 'dinheiro').map((t) => t.term)).toEqual(['Liquidez', 'Orçamento']);
    expect(searchGlossary(terms, 'zzz')).toEqual([]);
  });

  it('sem busca devolve tudo em ordem alfabética', () => {
    expect(searchGlossary(terms, '').map((t) => t.term)).toEqual([
      'Inflação',
      'Liquidez',
      'Orçamento',
    ]);
  });
});

describe('textos', () => {
  it('o aviso deixa claro que não é recomendação', () => {
    expect(EDUCATION_DISCLAIMER).toMatch(/não é recomendação/i);
  });

  it('formata o tempo de leitura', () => {
    expect(readingTimeLabel(3)).toBe('3 min de leitura');
  });
});
