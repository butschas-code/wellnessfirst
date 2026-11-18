/**
 * Chart drawings in the three regional styles, for any divisional chart.
 *  - North Indian: fixed houses (diamond), signs rotate with the Lagna.
 *  - South Indian: fixed signs (4×4 ring), Lagna marked.
 *  - East Indian: fixed signs (3×3 with split corners), Aries top-centre, counter-clockwise.
 */
import { esc } from './astro-ui.ts';

export type ChartStyle = 'north' | 'south' | 'east';

export interface ChartInput {
  /** Planet labels per sign index 0..11 (Aries..Pisces). */
  bySign: string[][];
  /** Lagna sign index. */
  ascSign: number;
  label: string;
}

const SIGN_ABBR = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
const S = 320;
const FRAME = `fill="color-mix(in srgb, var(--color-accent) 6%, #fff)" stroke="var(--color-line-strong)"`;

function textLines(x: number, y: number, items: string[], perLine: number) {
  const lines: string[] = [];
  for (let k = 0; k < items.length; k += perLine) lines.push(items.slice(k, k + perLine).join(' '));
  const y0 = y - ((lines.length - 1) * 13) / 2;
  return lines.map((l, i) => `<text x="${x}" y="${y0 + i * 13}" text-anchor="middle" font-size="11.5" font-weight="500" fill="var(--color-ink)">${esc(l)}</text>`).join('');
}

function north(c: ChartInput) {
  const h = S / 2, q = S / 4;
  const anchors: Array<[number, number]> = [[h, q], [q, q / 2.2], [q / 2.2, q], [q, h], [q / 2.2, S - q], [q, S - q / 2.2], [h, S - q], [S - q, S - q / 2.2], [S - q / 2.2, S - q], [S - q, h], [S - q / 2.2, q], [S - q, q / 2.2]];
  const cells = anchors
    .map(([x, y], i) => {
      const sign = (c.ascSign + i) % 12;
      const big = i % 3 === 0;
      return `<text x="${x}" y="${big ? y - 22 : y - 12}" text-anchor="middle" font-size="10" fill="var(--color-cool-gray)">${sign + 1}</text>${
        i === 0 ? `<text x="${x}" y="${y - 34}" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="var(--color-secondary)">ASC</text>` : ''
      }${textLines(x, y + (big ? 6 : 4), c.bySign[sign], big ? 3 : 2)}`;
    })
    .join('');
  return `<rect x="0" y="0" width="${S}" height="${S}" rx="10" ${FRAME}/><g stroke="var(--color-line-strong)"><line x1="0" y1="0" x2="${S}" y2="${S}"/><line x1="${S}" y1="0" x2="0" y2="${S}"/><polygon points="${h},0 ${S},${h} ${h},${S} 0,${h}" fill="none"/></g>${cells}`;
}

function south(c: ChartInput) {
  const w = S / 4;
  // [col,row] for each sign, Pisces top-left going clockwise
  const pos: Array<[number, number]> = [[1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0]];
  const cells = pos
    .map(([col, row], sign) => {
      const x = col * w, y = row * w;
      const isAsc = sign === c.ascSign;
      return `<rect x="${x}" y="${y}" width="${w}" height="${w}" fill="${isAsc ? 'color-mix(in srgb, var(--color-secondary) 14%, #fff)' : 'none'}" stroke="var(--color-line-strong)"/>
        <text x="${x + 6}" y="${y + 13}" font-size="9" fill="var(--color-cool-gray)">${SIGN_ABBR[sign]}</text>
        ${isAsc ? `<line x1="${x}" y1="${y + 18}" x2="${x + 18}" y2="${y}" stroke="var(--color-secondary)" stroke-width="1.5"/>` : ''}
        ${textLines(x + w / 2, y + w / 2 + 6, c.bySign[sign], 2)}`;
    })
    .join('');
  return `<rect x="0" y="0" width="${S}" height="${S}" rx="10" ${FRAME}/>${cells}<text x="${S / 2}" y="${S / 2 + 4}" text-anchor="middle" font-size="12" fill="var(--color-ink-500)">${esc(c.label)}</text>`;
}

function east(c: ChartInput) {
  const t = S / 3;
  type Cell = { sign: number; poly: string; cx: number; cy: number };
  const P = (pts: Array<[number, number]>) => pts.map(([x, y]) => `${x},${y}`).join(' ');
  const cells: Cell[] = [
    { sign: 0, poly: P([[t, 0], [2 * t, 0], [2 * t, t], [t, t]]), cx: 1.5 * t, cy: 0.5 * t },
    { sign: 1, poly: P([[0, 0], [t, 0], [t, t]]), cx: 0.68 * t, cy: 0.32 * t },
    { sign: 2, poly: P([[0, 0], [0, t], [t, t]]), cx: 0.32 * t, cy: 0.68 * t },
    { sign: 3, poly: P([[0, t], [t, t], [t, 2 * t], [0, 2 * t]]), cx: 0.5 * t, cy: 1.5 * t },
    { sign: 4, poly: P([[0, 2 * t], [t, 2 * t], [0, 3 * t]]), cx: 0.32 * t, cy: 2.32 * t },
    { sign: 5, poly: P([[t, 2 * t], [t, 3 * t], [0, 3 * t]]), cx: 0.68 * t, cy: 2.68 * t },
    { sign: 6, poly: P([[t, 2 * t], [2 * t, 2 * t], [2 * t, 3 * t], [t, 3 * t]]), cx: 1.5 * t, cy: 2.5 * t },
    { sign: 7, poly: P([[2 * t, 2 * t], [2 * t, 3 * t], [3 * t, 3 * t]]), cx: 2.32 * t, cy: 2.68 * t },
    { sign: 8, poly: P([[2 * t, 2 * t], [3 * t, 2 * t], [3 * t, 3 * t]]), cx: 2.68 * t, cy: 2.32 * t },
    { sign: 9, poly: P([[2 * t, t], [3 * t, t], [3 * t, 2 * t], [2 * t, 2 * t]]), cx: 2.5 * t, cy: 1.5 * t },
    { sign: 10, poly: P([[2 * t, t], [3 * t, 0], [3 * t, t]]), cx: 2.68 * t, cy: 0.68 * t },
    { sign: 11, poly: P([[2 * t, 0], [3 * t, 0], [2 * t, t]]), cx: 2.32 * t, cy: 0.32 * t },
  ];
  const body = cells
    .map((cl) => {
      const isAsc = cl.sign === c.ascSign;
      return `<polygon points="${cl.poly}" fill="${isAsc ? 'color-mix(in srgb, var(--color-secondary) 14%, #fff)' : 'none'}" stroke="var(--color-line-strong)"/>
        <text x="${cl.cx}" y="${cl.cy - 12}" text-anchor="middle" font-size="9" fill="var(--color-cool-gray)">${SIGN_ABBR[cl.sign]}${isAsc ? ' · ASC' : ''}</text>
        ${textLines(cl.cx, cl.cy + 4, c.bySign[cl.sign], 2)}`;
    })
    .join('');
  return `<rect x="0" y="0" width="${S}" height="${S}" rx="10" ${FRAME}/>${body}<text x="${S / 2}" y="${S / 2 + 4}" text-anchor="middle" font-size="12" fill="var(--color-ink-500)">${esc(c.label)}</text>`;
}

export function chartSvg(style: ChartStyle, input: ChartInput): string {
  const inner = style === 'south' ? south(input) : style === 'east' ? east(input) : north(input);
  return `<svg class="lr-chart-svg w-full" viewBox="-1 -1 ${S + 2} ${S + 2}" role="img" aria-label="${esc(input.label)} — ${style} Indian style">${inner}</svg>`;
}
