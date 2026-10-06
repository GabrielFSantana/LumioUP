import {
  CSV_BOM,
  EXPORT_MIME,
  TRANSACTIONS_CSV_HEADER,
  centsToDecimalString,
  consentLabel,
  csvCell,
  exportFileName,
  neutralizeFormula,
  toCsv,
  transactionsToCsv,
} from './privacy';

describe('csvCell', () => {
  it('não mexe em texto simples e trata vazios', () => {
    expect(csvCell('mercado')).toBe('mercado');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(42)).toBe('42');
  });

  it('coloca aspas quando há vírgula, aspas, ponto e vírgula ou quebra de linha', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('linha 1\nlinha 2')).toBe('"linha 1\nlinha 2"');
    expect(csvCell('ele disse "oi"')).toBe('"ele disse ""oi"""');
  });
});

describe('neutralizeFormula', () => {
  it('prefixa células que uma planilha executaria como fórmula', () => {
    for (const text of ['=SOMA(A1)', '+1', '-2', '@cmd', '\tx']) {
      expect(neutralizeFormula(text)).toBe(`'${text}`);
    }
  });

  it('mantém o texto normal', () => {
    expect(neutralizeFormula('Almoço')).toBe('Almoço');
    expect(neutralizeFormula('')).toBe('');
    expect(neutralizeFormula('a=b')).toBe('a=b');
  });
});

describe('centsToDecimalString', () => {
  it('formata com ponto decimal e duas casas', () => {
    expect(centsToDecimalString(123456)).toBe('1234.56');
    expect(centsToDecimalString(5)).toBe('0.05');
    expect(centsToDecimalString(100)).toBe('1.00');
    expect(centsToDecimalString(0)).toBe('0.00');
    expect(centsToDecimalString(-250)).toBe('-2.50');
  });
});

describe('toCsv', () => {
  it('começa com BOM e termina com quebra de linha', () => {
    const csv = toCsv(['a', 'b'], [['1', 'x,y']]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(`${CSV_BOM}a,b\r\n1,"x,y"\r\n`);
  });
});

describe('transactionsToCsv', () => {
  const data = {
    accounts: [
      { id: 'a1', name: 'Carteira' },
      { id: 'a2', name: 'Banco' },
    ],
    categories: [{ id: 'c1', name: 'Mercado' }],
    transactions: [
      {
        occurred_on: '2026-10-05',
        kind: 'expense',
        amount_cents: 1999,
        account_id: 'a1',
        category_id: 'c1',
        description: '=HYPERLINK("x")',
        deleted_at: null,
      },
      {
        occurred_on: '2026-10-01',
        kind: 'transfer',
        amount_cents: 50000,
        account_id: 'a1',
        to_account_id: 'a2',
        category_id: null,
        description: 'Guardar, com vírgula',
        deleted_at: '2026-10-02T00:00:00Z',
      },
    ],
  };

  it('gera cabeçalho, ordena por data e traduz nomes', () => {
    const lines = transactionsToCsv(data).replace(CSV_BOM, '').trim().split('\r\n');
    expect(lines[0]).toBe(TRANSACTIONS_CSV_HEADER.join(','));
    expect(lines[1]).toBe(
      '2026-10-01,Transferência,500.00,Carteira,Banco,,"Guardar, com vírgula",sim',
    );
    expect(lines[2]).toContain('2026-10-05,Gasto,19.99,Carteira,,Mercado,');
  });

  it('neutraliza fórmulas digitadas pelo usuário', () => {
    expect(transactionsToCsv(data)).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('funciona sem lançamentos', () => {
    expect(transactionsToCsv({})).toBe(`${CSV_BOM}${TRANSACTIONS_CSV_HEADER.join(',')}\r\n`);
  });
});

describe('textos de exportação e consentimento', () => {
  it('monta o nome do arquivo e o tipo', () => {
    expect(exportFileName('json', '2026-10-09')).toBe('lumioup-dados-2026-10-09.json');
    expect(exportFileName('csv', '2026-10-09')).toBe('lumioup-lancamentos-2026-10-09.csv');
    expect(EXPORT_MIME.csv).toBe('text/csv');
  });

  it('traduz os consentimentos e mantém os desconhecidos', () => {
    expect(consentLabel('terms')).toBe('Termos de uso');
    expect(consentLabel('privacy')).toBe('Política de privacidade');
    expect(consentLabel('outro')).toBe('outro');
  });
});
