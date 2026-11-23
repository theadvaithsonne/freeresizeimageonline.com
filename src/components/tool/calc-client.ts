/**
 * Browser logic of the size converter (cm, mm, inches <-> pixels). Pure arithmetic from the engine: nothing is sent anywhere.
 * The result updates while you type.
 */
import { convertLength, toPixels } from '../../engine';
import type { LengthUnit } from '../../engine/types';
import { formatNumber } from '../../i18n/format';

const UNITS: LengthUnit[] = ['px', 'cm', 'mm', 'in'];

export function initCalc(root: HTMLElement): void {
  const data = JSON.parse(root.querySelector('[data-calc-data]')!.textContent || '{}') as { lang: string };
  const lang = data.lang;
  const q = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;

  const width = q<HTMLInputElement>('[data-width]');
  const height = q<HTMLInputElement>('[data-height]');
  const from = q<HTMLSelectElement>('[data-from]');
  const to = q<HTMLSelectElement>('[data-to]');
  const dpi = q<HTMLInputElement>('[data-dpi]');
  const dpiField = q('[data-dpi-field]');
  const outWidth = q('[data-out-width]');
  const outHeight = q('[data-out-height]');
  const outUnit = q('[data-out-unit]');
  const outUnit2 = q('[data-out-unit-2]');
  const emptyNote = q('[data-empty]');
  const outBox = q('[data-out]');
  const errorBox = q('[data-error]');
  const copyButton = q<HTMLButtonElement>('[data-copy]');
  const swapButton = q<HTMLButtonElement>('[data-swap]');
  const live = q('[data-live]');
  const tableRows = root.querySelectorAll<HTMLElement>('[data-row]');
  const tableTitle = root.querySelector<HTMLElement>('[data-table-title]');
  const tableTitleTemplate = tableTitle?.dataset.template ?? '';

  const unitLabel = (unit: string) => root.querySelector<HTMLOptionElement>(`[data-to] option[value="${unit}"]`)?.dataset.short ?? unit;
  let copyText = '';
  let copyTimer = 0;

  function readNumber(input: HTMLInputElement): number {
    // "12,5" is how many languages write 12.5
    const value = Number(input.value.trim().replace(',', '.'));
    return Number.isFinite(value) ? value : NaN;
  }

  /** How many decimals to show: whole pixels, two for cm / mm / inches. */
  const shown = (value: number, unit: LengthUnit) => formatNumber(lang, unit === 'px' ? Math.round(value) : Math.round(value * 100) / 100, unit === 'px' ? 0 : 2);

  function plain(value: number, unit: LengthUnit): string {
    return unit === 'px' ? String(Math.round(value)) : String(Math.round(value * 100) / 100);
  }

  function update(): void {
    const fromUnit = from.value as LengthUnit;
    const toUnit = to.value as LengthUnit;
    const dpiValue = Math.min(2400, Math.max(1, readNumber(dpi) || 300));
    // DPI only matters when pixels are on one side of the conversion
    dpiField.hidden = fromUnit !== 'px' && toUnit !== 'px';
    const w = readNumber(width);
    const h = height.value.trim() === '' ? NaN : readNumber(height);
    const widthOk = w > 0;
    const heightOk = h > 0;

    errorBox.hidden = widthOk || width.value.trim() === '';
    if (!widthOk && !errorBox.hidden) width.setAttribute('aria-invalid', 'true');
    else width.removeAttribute('aria-invalid');
    outBox.hidden = !widthOk;
    emptyNote.hidden = widthOk;
    copyButton.disabled = !widthOk;
    if (!widthOk) {
      copyText = '';
      updateTable(dpiValue);
      return;
    }
    const wOut = convertLength(w, fromUnit, toUnit, dpiValue);
    outWidth.textContent = shown(wOut, toUnit);
    outUnit.textContent = unitLabel(toUnit);
    outUnit2.textContent = unitLabel(toUnit);
    const hOut = heightOk ? convertLength(h, fromUnit, toUnit, dpiValue) : NaN;
    const heightRow = q('[data-out-height-row]');
    heightRow.hidden = !heightOk;
    if (heightOk) outHeight.textContent = shown(hOut, toUnit);
    const unitText = unitLabel(toUnit);
    copyText = heightOk ? `${plain(wOut, toUnit)} x ${plain(hOut, toUnit)} ${unitText}` : `${plain(wOut, toUnit)} ${unitText}`;
    live.textContent = `${shown(wOut, toUnit)} ${unitText}`;
    updateTable(dpiValue);
  }

  function updateTable(dpiValue: number): void {
    if (tableTitle) tableTitle.textContent = tableTitleTemplate.replace('{dpi}', formatNumber(lang, dpiValue, 0));
    tableRows.forEach((row) => {
      const w = Number(row.dataset.w);
      const h = Number(row.dataset.h);
      const unit = row.dataset.unit as LengthUnit;
      const cell = row.querySelector('[data-px]');
      if (cell) cell.textContent = `${formatNumber(lang, toPixels(w, unit, dpiValue), 0)} x ${formatNumber(lang, toPixels(h, unit, dpiValue), 0)}`;
    });
  }

  [width, height, dpi].forEach((input) => input.addEventListener('input', update));
  [from, to].forEach((select) => select.addEventListener('change', update));

  root.querySelectorAll<HTMLButtonElement>('[data-dpi-choice]').forEach((button) =>
    button.addEventListener('click', () => {
      dpi.value = button.dataset.dpiChoice!;
      update();
    }),
  );

  swapButton.addEventListener('click', () => {
    const a = from.value;
    from.value = to.value;
    to.value = a;
    update();
  });

  copyButton.addEventListener('click', async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      copyButton.textContent = copyButton.dataset.done ?? '';
    } catch {
      return;
    }
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyButton.textContent = copyButton.dataset.label ?? '';
    }, 1800);
  });

  // a picked size in the table fills the form
  root.querySelectorAll<HTMLButtonElement>('[data-use]').forEach((button) =>
    button.addEventListener('click', () => {
      const row = button.closest<HTMLElement>('[data-row]')!;
      width.value = row.dataset.w!;
      height.value = row.dataset.h!;
      from.value = row.dataset.unit!;
      if (to.value === from.value) to.value = from.value === 'px' ? 'cm' : 'px';
      update();
      width.focus();
    }),
  );

  // an unusable `from`/`to` never happens, but keep the selects honest if the markup changes
  if (!UNITS.includes(from.value as LengthUnit)) from.value = 'cm';
  if (!UNITS.includes(to.value as LengthUnit)) to.value = 'px';
  update();
}
