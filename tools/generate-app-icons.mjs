/* global Buffer, console */
// Gera os ícones do app a partir do mascote Lumi (mesmo desenho de apps/mobile/src/components/ui/Mascot.tsx).
// Uso: npm i --no-save sharp && node tools/generate-app-icons.mjs
// Cores da identidade: Tinta #14213D, Luz #FFC400, Papel #FFF8E7. Rascunho: a arte final virá de ilustrador.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'apps/mobile/assets');
mkdirSync(out, { recursive: true });

const INK = '#14213D';

/** Lumi (viewBox 120x120). `glow` liga o brilho de fundo; `mono` desenha só a silhueta (alfa). */
function lumi({ glow = true, antenna = INK, ring = INK } = {}) {
  return `
    ${glow ? '<circle cx="60" cy="64" r="54" fill="#22386A"/>' : ''}
    <line x1="60" y1="38" x2="60" y2="14" stroke="${antenna}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="60" cy="12" r="7" fill="#FFFFFF" stroke="${antenna}" stroke-width="4"/>
    <circle cx="60" cy="68" r="36" fill="#FFC400" stroke="${ring}" stroke-width="5"/>
    <ellipse cx="47" cy="62" rx="8" ry="10" fill="#FFFFFF"/>
    <ellipse cx="73" cy="62" rx="8" ry="10" fill="#FFFFFF"/>
    <circle cx="49" cy="64" r="5" fill="${INK}"/>
    <circle cx="75" cy="64" r="5" fill="${INK}"/>
    <path d="M48 82 Q60 94 72 82" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="37" cy="77" r="4.5" fill="#FF9A7A" opacity="0.8"/>
    <circle cx="83" cy="77" r="4.5" fill="#FF9A7A" opacity="0.8"/>`;
}

/** Silhueta do Lumi para o ícone monocromático do Android (só o canal alfa importa). */
function lumiMono() {
  return `
    <defs>
      <mask id="cut">
        <rect width="120" height="120" fill="white"/>
        <ellipse cx="47" cy="62" rx="8" ry="10" fill="black"/>
        <ellipse cx="73" cy="62" rx="8" ry="10" fill="black"/>
        <path d="M48 82 Q60 94 72 82" fill="none" stroke="black" stroke-width="5" stroke-linecap="round"/>
      </mask>
    </defs>
    <g mask="url(#cut)" fill="white" stroke="white">
      <line x1="60" y1="30" x2="60" y2="16" stroke-width="6" stroke-linecap="round"/>
      <circle cx="60" cy="12" r="8" stroke-width="0"/>
      <circle cx="60" cy="68" r="38" stroke-width="0"/>
    </g>`;
}

/** Coloca o desenho (viewBox 120) numa tela `size`, ocupando `fraction` da largura e centralizado. */
function canvas(size, fraction, body, background) {
  const drawn = size * fraction;
  const offset = (size - drawn) / 2;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
      <svg x="${offset}" y="${offset}" width="${drawn}" height="${drawn}" viewBox="0 0 120 120">${body}</svg>
    </svg>`);
}

const jobs = [
  // iOS e lojas: sem transparência.
  ['icon.png', 1024, canvas(1024, 0.78, lumi(), INK)],
  // Android adaptativo: o sistema recorta, então o desenho fica na zona segura (~66%).
  [
    'android-icon-foreground.png',
    1024,
    canvas(1024, 0.62, lumi({ glow: false, antenna: '#FFF8E7', ring: '#FFF8E7' }), null),
  ],
  ['android-icon-background.png', 1024, canvas(1024, 1, '', INK)],
  ['android-icon-monochrome.png', 1024, canvas(1024, 0.62, lumiMono(), null)],
  // Tela de abertura: fundo transparente (a cor vem do app.json, claro e escuro).
  ['splash-icon.png', 1024, canvas(1024, 0.8, lumi({ glow: false }), null)],
  ['favicon.png', 48, canvas(48, 0.96, lumi({ glow: false }), INK)],
];

for (const [name, size, svg] of jobs) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(join(out, name));
  console.log('gerado', name, `${size}x${size}`);
}
