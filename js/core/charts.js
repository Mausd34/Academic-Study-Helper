/**
 * Dependency-free SVG charts. Every function returns an HTML string.
 * No external chart library — keeps the app offline-capable and tiny.
 */
import { esc, toNumber } from './utils.js';

const PALETTE = ['#635bff', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];

export const colors = (count) => Array.from({ length: Math.max(1, count) }, (_, i) => PALETTE[i % PALETTE.length]);

const empty = (message = 'No data yet') => `<div class="chart-empty">${esc(message)}</div>`;

const wrap = (inner, height) => `<div class="chart" style="--chart-h:${height}px">${inner}</div>`;

/** Vertical bar chart. data: [{ label, value, color? }] */
export function barChart(data, { height = 160, format = (v) => String(Math.round(v * 10) / 10), max } = {}) {
  const rows = (data || []).filter((d) => d && Number.isFinite(toNumber(d.value)));
  if (!rows.length) return empty();
  const peak = max ?? Math.max(...rows.map((d) => toNumber(d.value)), 1);
  const palette = colors(rows.length);
  const scale = peak > 0 ? (height - 46) / peak : 0;
  return wrap(`
    <div class="bars" role="img">
      ${rows.map((d, i) => {
    const value = toNumber(d.value);
    const h = value > 0 ? Math.max(4, Math.round(value * scale)) : 2;
    return `<div class="bar-col" title="${esc(d.label)}: ${esc(format(value))}">
            <div class="bar-value">${esc(format(value))}</div>
            <div class="bar-track"><div class="bar-fill" style="height:${h}px;background:${d.color || palette[i]}"></div></div>
            <div class="bar-label">${esc(d.label)}</div>
          </div>`;
  }).join('')}
    </div>`, height);
}

/** Horizontal bar chart — better for long category names. */
export function hBarChart(data, { format = (v) => String(Math.round(v * 10) / 10), max } = {}) {
  const rows = (data || []).filter((d) => d && Number.isFinite(toNumber(d.value)));
  if (!rows.length) return empty();
  const peak = max ?? Math.max(...rows.map((d) => toNumber(d.value)), 1);
  const palette = colors(rows.length);
  return wrap(`
    <div class="hbars" role="img">
      ${rows.map((d, i) => {
    const value = toNumber(d.value);
    const width = peak > 0 ? Math.max(1, Math.round((value / peak) * 100)) : 0;
    return `<div class="hbar-row">
            <span class="hbar-label">${esc(d.label)}</span>
            <span class="hbar-track"><span class="hbar-fill" style="width:${width}%;background:${d.color || palette[i]}"></span></span>
            <span class="hbar-value">${esc(format(value))}</span>
          </div>`;
  }).join('')}
    </div>`, rows.length * 30);
}

/** Donut chart with an inline legend. data: [{ label, value, color? }] */
export function donutChart(data, { size = 150, thickness = 22, centerLabel = '', centerValue = '' } = {}) {
  const rows = (data || []).filter((d) => d && toNumber(d.value) > 0);
  const total = rows.reduce((sum, d) => sum + toNumber(d.value), 0);
  if (!rows.length || total <= 0) return empty();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const palette = colors(rows.length);
  const segments = rows.map((d, i) => {
    const fraction = toNumber(d.value) / total;
    const length = fraction * circumference;
    const segment = `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none"
      stroke="${d.color || palette[i]}" stroke-width="${thickness}"
      stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle>`;
    offset += length;
    return segment;
  }).join('');
  const legend = rows.map((d, i) => `<li><span class="dot" style="background:${d.color || palette[i]}"></span>${esc(d.label)} <strong>${Math.round((toNumber(d.value) / total) * 100)}%</strong></li>`).join('');
  return `
    <div class="donut-wrap">
      <div class="donut" style="width:${size}px;height:${size}px" role="img">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${segments}</svg>
        ${centerValue ? `<div class="donut-center"><strong>${esc(centerValue)}</strong>${centerLabel ? `<span>${esc(centerLabel)}</span>` : ''}</div>` : ''}
      </div>
      <ul class="donut-legend">${legend}</ul>
    </div>`;
}


/** Line/area chart for trends. data: [{ label, value }] */
export function lineChart(data, { height = 170, format = (v) => String(Math.round(v * 10) / 10) } = {}) {
  const rows = (data || []).filter((d) => d && Number.isFinite(toNumber(d.value)));
  if (rows.length < 2) return empty('Need at least two points');
  const width = 600;
  const padX = 8;
  const padTop = 16;
  const padBottom = 26;
  const values = rows.map((d) => toNumber(d.value));
  const peak = Math.max(...values, 1);
  const innerH = height - padTop - padBottom;
  const step = (width - padX * 2) / (rows.length - 1);
  const points = values.map((v, i) => [padX + i * step, padTop + innerH - (v / peak) * innerH]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${padTop + innerH} L${points[0][0].toFixed(1)} ${padTop + innerH} Z`;
  return wrap(`
    <div class="line-wrap" role="img">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="line-svg">
        <path d="${area}" fill="url(#lineFill)"></path>
        <path d="${line}" fill="none" stroke="#635bff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
        <defs><linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#635bff" stop-opacity="0.28"></stop>
          <stop offset="100%" stop-color="#635bff" stop-opacity="0"></stop>
        </linearGradient></defs>
        ${points.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#fff" stroke="#635bff" stroke-width="2"><title>${esc(rows[i].label)}: ${esc(format(values[i]))}</title></circle>`).join('')}
      </svg>
      <div class="line-labels">${rows.map((d) => `<span>${esc(d.label)}</span>`).join('')}</div>
    </div>`, height);
}

/** Progress ring used for attendance and skill summaries. */
export function ringChart(value, { size = 120, thickness = 12, label = '', tone = '#635bff' } = {}) {
  const pct = Math.max(0, Math.min(100, toNumber(value)));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  return `
    <div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="${esc(label)}: ${pct}%">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="var(--line)" stroke-width="${thickness}"></circle>
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${tone}" stroke-width="${thickness}"
          stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}"
          transform="rotate(-90 ${size / 2} ${size / 2})"></circle>
      </svg>
      <div class="ring-center"><strong>${Math.round(pct * 10) / 10}%</strong>${label ? `<span>${esc(label)}</span>` : ''}</div>
    </div>`;
}

/** Compact segmented bar — good for difficulty mix or status mix. */
export function stackedBar(segments, { height = 14 } = {}) {
  const rows = (segments || []).filter((s) => toNumber(s.value) > 0);
  const total = rows.reduce((sum, s) => sum + toNumber(s.value), 0);
  if (!total) return empty();
  const palette = colors(rows.length);
  return `
    <div class="stacked" style="height:${height}px" role="img">
      ${rows.map((s, i) => `<span title="${esc(s.label)}: ${s.value}" style="width:${(toNumber(s.value) / total) * 100}%;background:${s.color || palette[i]}"></span>`).join('')}
    </div>
    <ul class="stacked-legend">${rows.map((s, i) => `<li><span class="dot" style="background:${s.color || palette[i]}"></span>${esc(s.label)} <strong>${s.value}</strong></li>`).join('')}</ul>`;
}
