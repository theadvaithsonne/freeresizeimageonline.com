/**
 * Browser logic for the resizer widget. Two views:
 *   setup   - drop zone, list of added images, options
 *   results - shown after "Resize images": progress, a card per image, download format, ZIP
 * All image work is delegated to the engine (src/engine); nothing is uploaded anywhere.
 */
import {
  DEFAULT_OPTIONS,
  batchProgress,
  convertResult,
  createEncoder,
  createItems,
  downloadBlob,
  dpiForUnitChange,
  fromPixels,
  lockedCounterpart,
  looksLikeImage,
  processImage,
  runBatch,
  toPixels,
  zipFiles,
  type BatchItem,
  type ConvertedFile,
  type Encoder,
  type FitMode,
  type FormatChoice,
  type LengthUnit,
  type OutputFormat,
  type ResizeOptions,
  type SizeMode,
} from '../../engine';
import { findPreset } from '../../data/presets';
import { formatBytes, formatNumber } from '../../i18n/format';

interface ToolItem extends BatchItem<File> {
  /** Small thumbnail of the original (object URL). */
  thumbUrl?: string;
  /** Preview of the resized result (object URL), only for modest sizes. */
  previewUrl?: string;
  /** Row in the setup list. */
  el?: HTMLElement;
  /** Card in the results grid. */
  card?: HTMLElement;
}

const MAX_FILES = 500;
/** Results above this many pixels are previewed with the small thumbnail instead (saves memory with big batches). */
const PREVIEW_MAX_PIXELS = 2_500_000;

export function initTool(root: HTMLElement): void {
  const data = JSON.parse(root.querySelector('[data-tool-data]')!.textContent || '{}') as {
    lang: string;
    initialPreset: string;
    initialFormat: FormatChoice;
    initialMode: SizeMode | '';
    initialUnit: LengthUnit | '';
    initialDpi: number;
    text: Record<string, unknown>;
  };
  const lang = data.lang;

  const q = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const qa = <T extends HTMLElement>(selector: string): T[] => Array.from(root.querySelectorAll<T>(selector));

  /** Look up "status.done" in the translated tool strings and fill {placeholders}. */
  function tx(path: string, vars?: Record<string, string | number>): string {
    let node: unknown = data.text;
    for (const part of path.split('.')) {
      if (typeof node !== 'object' || node === null) return path;
      node = (node as Record<string, unknown>)[part];
    }
    if (typeof node !== 'string') return path;
    return vars ? node.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : node;
  }

  // --- elements -----------------------------------------------------------------------------
  const setupView = q('[data-setup]');
  const resultsView = q('[data-results]');
  const drop = q('[data-drop]');
  const fileInput = q<HTMLInputElement>('[data-file-input]');
  const notice = q('[data-notice]');
  const filesBox = q('[data-files]');
  const filesTitle = q('[data-files-title]');
  const list = q('[data-list]');
  const live = q('[data-live]');
  const rowTemplate = q<HTMLTemplateElement>('[data-row-template]');
  const cardTemplate = q<HTMLTemplateElement>('[data-card-template]');
  const form = q<HTMLFormElement>('[data-options]');
  const presetSelect = q<HTMLSelectElement>('[data-preset]');
  const presetHint = q('[data-preset-hint]');
  const modeRadios = qa<HTMLInputElement>('[data-mode]');
  const widthInput = q<HTMLInputElement>('[data-width]');
  const heightInput = q<HTMLInputElement>('[data-height]');
  const unitSelect = q<HTMLSelectElement>('[data-unit]');
  const dpiField = q('[data-dpi-field]');
  const dpiInput = q<HTMLInputElement>('[data-dpi]');
  const lockInput = q<HTMLInputElement>('[data-lock]');
  const fitField = q('[data-fit-field]');
  const fitSelect = q<HTMLSelectElement>('[data-fit]');
  const percentInput = q<HTMLInputElement>('[data-percent]');
  const formatSelect = q<HTMLSelectElement>('[data-format]');
  const pngNote = q('[data-png-note]');
  const qualityField = q('[data-quality-field]');
  const qualityInput = q<HTMLInputElement>('[data-quality]');
  const qualityOut = q('[data-quality-out]');
  const targetToggle = q<HTMLInputElement>('[data-target-toggle]');
  const targetRow = q('[data-target-row]');
  const targetValue = q<HTMLInputElement>('[data-target-value]');
  const targetUnit = q<HTMLSelectElement>('[data-target-unit]');
  const targetNote = q('[data-target-note]');
  const runButton = q<HTMLButtonElement>('[data-run]');
  const runError = q('[data-run-error]');
  const chooseButton = q<HTMLButtonElement>('[data-choose]');

  // results view
  const resultsTitle = q('[data-results-title]');
  const resultsSub = q('[data-results-sub]');
  const resultsTotal = q('[data-results-total]');
  const resultsAlert = q('[data-results-alert]');
  const progress = q('[data-progress]');
  const progressBar = q('[data-progress-bar]');
  const progressMeter = q('[data-progress-meter]');
  const grid = q('[data-grid]');
  const backButton = q<HTMLButtonElement>('[data-back]');
  const startOverButton = q<HTMLButtonElement>('[data-start-over]');
  const cancelButton = q<HTMLButtonElement>('[data-cancel]');
  const downloadGroup = q('[data-download-group]');
  const downloadAllButton = q<HTMLButtonElement>('[data-download-all]');
  const saveAsSelect = q<HTMLSelectElement>('[data-saveas]');

  // --- state --------------------------------------------------------------------------------
  const items: ToolItem[] = [];
  let nextId = 1;
  let running = false;
  let view: 'setup' | 'results' = 'setup';
  let abort: AbortController | null = null;
  let aspect: number | null = null; // height / width of the first readable image
  let aspectSource: ToolItem | null = null; // the image that aspect came from
  let currentEncoder: Encoder | null = null; // lets Cancel stop an encode that is already running
  let runTarget: number | undefined; // the file-size limit used by the last run
  let lockedSide: 'w' | 'h' = 'w';
  let currentUnit: LengthUnit = 'px';
  let thumbChain: Promise<void> = Promise.resolve();

  // --- helpers ------------------------------------------------------------------------------
  const say = (message: string) => {
    live.textContent = '';
    // Re-set on the next frame so screen readers announce repeated messages.
    requestAnimationFrame(() => (live.textContent = message));
  };

  function showNotice(message: string | null) {
    notice.hidden = !message;
    notice.textContent = message ?? '';
  }
  function showResultsAlert(message: string | null) {
    resultsAlert.hidden = !message;
    resultsAlert.textContent = message ?? '';
  }

  function mode(): SizeMode {
    return (modeRadios.find((r) => r.checked)?.value ?? 'dimensions') as SizeMode;
  }

  /**
   * The file-size limit in bytes. KB and MB are counted the strict way (1 KB = 1,000 bytes) so a file made for
   * "50 KB" is under 50,000 bytes and passes on portals that count 1,000 as well as those that count 1,024.
   */
  function targetBytes(): number | undefined {
    if (!targetToggle.checked) return undefined;
    const v = targetValue.valueAsNumber;
    if (!Number.isFinite(v) || v <= 0) return undefined;
    return Math.round(v * (targetUnit.value === 'MB' ? 1_000_000 : 1_000));
  }

  // --- messages next to the Resize button ---------------------------------------------------
  const markInvalid = (el: HTMLElement | null) => {
    for (const field of [widthInput, heightInput, percentInput, targetValue]) field.removeAttribute('aria-invalid');
    el?.setAttribute('aria-invalid', 'true');
  };
  function clearRunError() {
    runError.hidden = true;
    runError.textContent = '';
    markInvalid(null);
  }
  /** Show the problem right above the button, mark the field and put the cursor there (works on phones too). */
  function showRunError(message: string, field: HTMLInputElement) {
    runError.textContent = message;
    runError.hidden = false;
    markInvalid(field);
    field.focus({ preventScroll: true });
    field.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  [widthInput, heightInput, percentInput, targetValue].forEach((f) => f.addEventListener('input', clearRunError));
  targetToggle.addEventListener('change', clearRunError);
  modeRadios.forEach((r) => r.addEventListener('change', clearRunError));

  /** Wrap text that is mostly numbers and units so it keeps its order inside right-to-left sentences. */
  const ltr = (s: string) => `⁦${s}⁩`;

  /** Switch between the setup view and the results view, and bring the tool into sight. */
  function setView(next: 'setup' | 'results', focusResults = false) {
    view = next;
    root.dataset.view = next;
    setupView.hidden = next !== 'setup';
    resultsView.hidden = next !== 'results';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (focusResults) resultsTitle.focus({ preventScroll: true });
    // Lets the page fill an ad box that has just become visible (the one under the results).
    window.dispatchEvent(new CustomEvent('frio:view', { detail: { view: next } }));
  }

  function readOptions(): ResizeOptions {
    const m = mode();
    const opts: ResizeOptions = {
      ...DEFAULT_OPTIONS,
      mode: m,
      unit: unitSelect.value as LengthUnit,
      dpi: Math.min(1200, Math.max(30, dpiInput.valueAsNumber || 96)),
      fit: fitSelect.value as FitMode,
      format: formatSelect.value as FormatChoice,
      quality: qualityInput.valueAsNumber || 85,
      targetBytes: targetBytes(),
    };
    if (m === 'percent') opts.percent = percentInput.valueAsNumber;
    if (m === 'dimensions') {
      const w = widthInput.valueAsNumber;
      const h = heightInput.valueAsNumber;
      if (lockInput.checked) {
        // Locked: only the side the user typed last decides the size; the other follows each image's own ratio.
        if (lockedSide === 'w') opts.width = Number.isFinite(w) ? w : undefined;
        else opts.height = Number.isFinite(h) ? h : undefined;
        if (opts.width === undefined && opts.height === undefined) {
          opts.width = Number.isFinite(w) ? w : undefined;
          opts.height = Number.isFinite(h) ? h : undefined;
        }
      } else {
        opts.width = Number.isFinite(w) ? w : undefined;
        opts.height = Number.isFinite(h) ? h : undefined;
      }
    }
    return opts;
  }

  // --- options UI ---------------------------------------------------------------------------
  function refreshOptionsUI() {
    const m = mode();
    q('[data-panel="dimensions"]').hidden = m !== 'dimensions';
    q('[data-panel="percent"]').hidden = m !== 'percent';
    const physical = unitSelect.value !== 'px';
    dpiField.hidden = !physical || m !== 'dimensions';
    fitField.hidden = lockInput.checked || m !== 'dimensions';
    const isPng = formatSelect.value === 'png';
    pngNote.hidden = !(isPng && targetToggle.checked);
    const useTarget = targetToggle.checked;
    targetRow.hidden = !useTarget;
    targetNote.hidden = !useTarget || isPng;
    qualityField.hidden = isPng || useTarget;
    qualityOut.textContent = String(qualityInput.valueAsNumber || 85);
    runButton.disabled = items.length === 0 || running;
  }

  /** Keep the other side in sync when the aspect ratio is locked. */
  function syncLocked() {
    if (!lockInput.checked || !aspect) return;
    const unit = unitSelect.value as LengthUnit;
    if (lockedSide === 'w') {
      const w = widthInput.valueAsNumber;
      heightInput.value = Number.isFinite(w) ? String(lockedCounterpart(w, 1, aspect, unit)) : '';
    } else {
      const h = heightInput.valueAsNumber;
      widthInput.value = Number.isFinite(h) ? String(lockedCounterpart(h, aspect, 1, unit)) : '';
    }
  }

  widthInput.addEventListener('input', () => {
    lockedSide = 'w';
    presetSelect.value = '';
    syncLocked();
  });
  heightInput.addEventListener('input', () => {
    lockedSide = 'h';
    presetSelect.value = '';
    syncLocked();
  });
  lockInput.addEventListener('change', () => {
    syncLocked();
    refreshOptionsUI();
  });
  modeRadios.forEach((r) => r.addEventListener('change', refreshOptionsUI));
  fitSelect.addEventListener('change', () => (presetSelect.value = ''));
  qualityInput.addEventListener('input', refreshOptionsUI);
  formatSelect.addEventListener('change', refreshOptionsUI);
  targetToggle.addEventListener('change', refreshOptionsUI);

  unitSelect.addEventListener('change', () => {
    const next = unitSelect.value as LengthUnit;
    // Leaving pixels for a physical unit: a low screen DPI (96) would make the output ~3x bigger than intended
    // when the size is later printed, so switch to print DPI first and convert with that value.
    const dpi = dpiForUnitChange(currentUnit, next, dpiInput.valueAsNumber || 300);
    // Keep the same pixel size when the unit changes (e.g. 1080 px -> 9.14 cm at 300 DPI).
    for (const input of [widthInput, heightInput]) {
      const v = input.valueAsNumber;
      if (Number.isFinite(v)) input.value = String(fromPixels(toPixels(v, currentUnit, dpi), next, dpi));
    }
    dpiInput.value = String(dpi);
    currentUnit = next;
    refreshOptionsUI();
  });

  // --- presets ------------------------------------------------------------------------------
  function applyPreset(id: string) {
    const preset = findPreset(id);
    presetSelect.value = preset ? id : '';
    presetHint.hidden = !preset || !/^(passport|visa|pan)/.test(id);
    if (!preset) return;

    if (preset.kind === 'target') {
      modeRadios.forEach((r) => (r.checked = r.value === 'keep'));
      targetToggle.checked = true;
      if (preset.kb >= 1024) {
        targetValue.value = String(preset.kb / 1024);
        targetUnit.value = 'MB';
      } else {
        targetValue.value = String(preset.kb);
        targetUnit.value = 'KB';
      }
      if (formatSelect.value === 'original' || formatSelect.value === 'png') formatSelect.value = 'jpeg';
    } else {
      modeRadios.forEach((r) => (r.checked = r.value === 'dimensions'));
      targetToggle.checked = false;
      unitSelect.value = preset.unit;
      currentUnit = preset.unit;
      dpiInput.value = String(preset.unit === 'px' ? 96 : preset.dpi);
      widthInput.value = String(preset.width);
      heightInput.value = preset.height ? String(preset.height) : '';
      const both = preset.height !== undefined;
      lockInput.checked = !both;
      lockedSide = 'w';
      fitSelect.value = preset.fit;
      if (preset.format) formatSelect.value = preset.format;
      syncLocked();
    }
    refreshOptionsUI();
  }
  presetSelect.addEventListener('change', () => applyPreset(presetSelect.value));

  // --- choosing the download format after resizing ------------------------------------------
  const FORMAT_LABEL: Record<OutputFormat, string> = { jpeg: 'JPG', png: 'PNG', webp: 'WebP' };
  /** Converted copies already made, so downloading the same format twice doesn't re-encode. */
  const converted = new Map<string, ConvertedFile>();

  function chosenFormat(item: ToolItem): OutputFormat | null {
    const value = saveAsSelect.value as OutputFormat | '';
    return value || item.result?.format || null;
  }

  function downloadLabel(item: ToolItem): string {
    const format = chosenFormat(item);
    return format ? `${tx('actions.download')} · ${FORMAT_LABEL[format]}` : tx('actions.download');
  }

  /** The file to save for this item: the resized result, or a re-encoded copy in the chosen format. */
  async function fileFor(item: ToolItem): Promise<ConvertedFile> {
    const result = item.result!;
    const format = chosenFormat(item)!;
    if (format === result.format) return { blob: result.blob, name: result.name, format };

    const quality = Math.min(1, Math.max(0.1, (qualityInput.valueAsNumber || 90) / 100));
    const key = `${item.id}:${format}:${runTarget ?? 0}:${quality}`;
    const cached = converted.get(key);
    if (cached) return cached;

    const encoder = createEncoder();
    try {
      // The file-size limit used for this run still applies when another format is chosen (JPG and WebP:
      // the quality is searched again; PNG cannot be reduced, so say so).
      const file = await convertResult(result, format, encoder, { quality, targetBytes: runTarget });
      if (runTarget && format === 'png') {
        showResultsAlert(tx('results.limitNote'));
      } else if (file.reachedTarget === false) {
        showResultsAlert(tx('result.targetMissed', { target: ltr(formatBytes(lang, runTarget!)), size: ltr(formatBytes(lang, file.blob.size)) }));
      }
      converted.set(key, file);
      return file;
    } finally {
      encoder.dispose();
    }
  }

  async function downloadOne(item: ToolItem, button: HTMLButtonElement) {
    if (!item.result) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = tx('actions.working');
    try {
      const file = await fileFor(item);
      downloadBlob(file.blob, file.name);
    } catch {
      showResultsAlert(tx('errors.encode-failed'));
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  // --- rows (setup) and cards (results) -----------------------------------------------------
  function percentText(saved: number): { text: string; smaller: boolean } {
    const smaller = saved > 0.005;
    const percent = ltr(`${Math.round(Math.abs(saved) * 100)}%`);
    return { text: tx(smaller ? 'result.smaller' : 'result.larger', { percent }), smaller };
  }

  function revokePreview(item: ToolItem) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    item.previewUrl = undefined;
  }

  function updateRow(item: ToolItem) {
    const el = item.el;
    if (!el) return;
    (el.querySelector('[data-name]') as HTMLElement).textContent = item.file.name;
    (el.querySelector('[data-meta]') as HTMLElement).textContent = formatBytes(lang, item.file.size);
    (el.querySelector('[data-remove]') as HTMLElement).setAttribute('aria-label', tx('files.remove', { name: item.file.name }));
  }

  function updateCard(item: ToolItem) {
    const card = item.card;
    if (!card) return;
    const $ = (selector: string) => card.querySelector(selector) as HTMLElement;
    card.dataset.state = item.status;
    $('[data-name]').textContent = item.file.name;
    $('[data-name]').title = item.file.name;
    $('[data-status]').textContent = tx(`status.${item.status}`);

    const done = item.status === 'done' && item.result;
    const dims = $('[data-dims]');
    const meta = $('[data-meta]');
    const sizes = $('[data-sizes]');
    const badge = $('[data-badge]');
    const download = $('[data-download]') as HTMLButtonElement;
    const img = card.querySelector('img') as HTMLImageElement;

    if (done) {
      const r = item.result!;
      const saved = 1 - r.outputBytes / Math.max(1, r.originalBytes);
      const change = percentText(saved);
      dims.textContent = `${formatNumber(lang, r.width, 0)} × ${formatNumber(lang, r.height, 0)} px`;
      meta.hidden = true;
      sizes.hidden = false;
      $('[data-size-before]').textContent = formatBytes(lang, r.originalBytes);
      $('[data-size-after]').textContent = formatBytes(lang, r.outputBytes);
      badge.hidden = false;
      badge.textContent = change.text;
      badge.classList.toggle('rcard__badge--larger', !change.smaller);
      download.hidden = false;
      download.textContent = downloadLabel(item);
      if (!item.previewUrl && r.width * r.height <= PREVIEW_MAX_PIXELS) {
        item.previewUrl = URL.createObjectURL(r.blob);
      }
      const source = item.previewUrl ?? item.thumbUrl;
      if (source && img.src !== source) img.src = source;
    } else {
      dims.textContent = '';
      sizes.hidden = true;
      badge.hidden = true;
      download.hidden = true;
      meta.hidden = false;
      meta.textContent = formatBytes(lang, item.file.size);
      if (item.thumbUrl && img.src !== item.thumbUrl) img.src = item.thumbUrl;
    }

    const err = $('[data-error]');
    let message = '';
    if (item.status === 'error') message = tx(`errors.${item.error ?? 'encode-failed'}`);
    else if (done && item.result!.reachedTarget === false) {
      const target = targetBytes();
      message = tx('result.targetMissed', {
        target: target ? formatBytes(lang, target) : '',
        size: formatBytes(lang, item.result!.outputBytes),
      });
    }
    err.hidden = !message;
    err.textContent = message;

    const remove = $('[data-remove]') as HTMLButtonElement;
    remove.setAttribute('aria-label', tx('files.remove', { name: item.file.name }));
    remove.disabled = item.status === 'processing';
  }

  /** Build one card per image for the results view. */
  function buildCards() {
    grid.replaceChildren();
    for (const item of items) {
      const card = cardTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
      item.card = card;
      card.dataset.id = String(item.id);
      card.querySelector('[data-remove]')!.addEventListener('click', () => removeItem(item));
      card.querySelector('[data-download]')!.addEventListener('click', (event) => {
        void downloadOne(item, event.currentTarget as HTMLButtonElement);
      });
      grid.appendChild(card);
      updateCard(item);
    }
  }

  /** Progress header, totals and toolbar state of the results view. */
  function refreshResults() {
    const p = batchProgress(items);
    const doneItems = items.filter((i) => i.status === 'done' && i.result);

    progress.hidden = !running;
    const percent = Math.round(p.fraction * 100);
    progressBar.style.width = `${percent}%`;
    progressMeter.setAttribute('aria-valuenow', String(percent));
    // "x of y done" counts only images that really finished; failures and cancelled images are not "done".
    resultsSub.textContent =
      doneItems.length === p.total && !running
        ? tx('result.finished')
        : doneItems.length > 0 || running
          ? tx('result.summary', { done: ltr(String(doneItems.length)), total: ltr(String(p.total)) })
          : '';

    if (doneItems.length > 0) {
      const before = doneItems.reduce((sum, i) => sum + i.result!.originalBytes, 0);
      const after = doneItems.reduce((sum, i) => sum + i.result!.outputBytes, 0);
      const change = percentText(1 - after / Math.max(1, before));
      resultsTotal.hidden = false;
      resultsTotal.textContent = `${tx('results.total', { before: ltr(formatBytes(lang, before)), after: ltr(formatBytes(lang, after)) })} (${change.text})`;
    } else {
      resultsTotal.hidden = true;
    }

    if (!running && p.finished === p.total && doneItems.length === 0 && p.total > 0) {
      showResultsAlert(tx('results.allFailed'));
    } else if (resultsAlert.textContent === tx('results.allFailed')) {
      showResultsAlert(null); // images were removed or a new run started: the "nothing worked" message no longer applies
    }

    cancelButton.hidden = !running;
    backButton.hidden = running;
    startOverButton.hidden = running;
    downloadGroup.hidden = running || doneItems.length === 0;
    downloadAllButton.hidden = doneItems.length < 2;
  }

  // --- the list of added images (setup view) -------------------------------------------------
  function refreshList() {
    const has = items.length > 0;
    root.classList.toggle('has-files', has);
    filesBox.hidden = !has;
    filesTitle.textContent = tx('files.title', { count: items.length });
    refreshOptionsUI();
  }

  async function makeThumb(item: ToolItem) {
    try {
      let bitmap: ImageBitmap;
      if (item.el && aspect === null && items.includes(item)) {
        // The first readable image defines the locked aspect ratio, so read its exact size (full decode, once).
        // If it cannot be read the error is caught below and the next image gets its turn.
        bitmap = await createImageBitmap(item.file, { imageOrientation: 'from-image' });
        aspect = bitmap.height / bitmap.width;
        aspectSource = item;
        syncLocked();
      } else {
        try {
          bitmap = await createImageBitmap(item.file, { resizeWidth: 160, resizeQuality: 'low', imageOrientation: 'from-image' });
        } catch {
          bitmap = await createImageBitmap(item.file);
        }
      }
      const scale = Math.min(1, 160 / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const tctx = canvas.getContext('2d')!;
      tctx.fillStyle = '#f1f4f9'; // light backdrop so transparent images don't turn black in the thumbnail
      tctx.fillRect(0, 0, canvas.width, canvas.height);
      tctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.75));
      canvas.width = 0;
      if (blob && items.includes(item)) {
        item.thumbUrl = URL.createObjectURL(blob);
        const rowImg = item.el?.querySelector('img');
        if (rowImg) rowImg.src = item.thumbUrl;
        updateCard(item); // a card may already exist (thumbnail finished after the run started)
      }
    } catch {
      /* no thumbnail: the row still works */
    }
  }

  function addFiles(files: ArrayLike<File>) {
    if (running) return; // don't change the batch while it is being processed
    showNotice(null);
    const all = Array.from(files);
    const incoming = all.filter((f) => looksLikeImage(f));
    const skipped = all.length - incoming.length;
    const room = Math.max(0, MAX_FILES - items.length);
    const accepted = incoming.slice(0, room);
    const tooMany = incoming.length - accepted.length;

    // Tell the visitor about everything that was not added instead of dropping it silently.
    const notes: string[] = [];
    if (accepted.length === 0 && tooMany === 0 && all.length > 0) notes.push(tx('drop.none'));
    else if (skipped > 0) notes.push(tx('drop.skipped', { count: skipped }));
    if (tooMany > 0) notes.push(tx('drop.tooMany', { max: MAX_FILES }));
    if (notes.length > 0) showNotice(notes.join(' '));
    if (accepted.length === 0) return;

    // Dropping new images while looking at results goes back to the setup view with the new images added.
    if (view === 'results') setView('setup');
    const created = createItems(accepted, nextId) as ToolItem[];
    nextId += created.length;
    for (const item of created) {
      const node = rowTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
      item.el = node;
      node.dataset.id = String(item.id);
      node.querySelector('[data-remove]')!.addEventListener('click', () => removeItem(item));
      list.appendChild(node);
      items.push(item);
      updateRow(item);
      thumbChain = thumbChain.then(() => makeThumb(item));
    }
    refreshList();
  }

  function removeItem(item: ToolItem) {
    if (item.status === 'processing') return;
    const index = items.indexOf(item);
    if (index < 0) return;
    items.splice(index, 1);
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    revokePreview(item);
    item.el?.remove();
    item.card?.remove();
    if (items.length === 0) {
      startOver();
      return;
    }
    if (item === aspectSource) {
      // The locked ratio came from the removed image: take it from the next readable one.
      aspect = null;
      aspectSource = null;
      thumbChain = thumbChain.then(() => ensureAspect());
    }
    refreshList();
    if (view === 'results') refreshResults();
  }

  async function ensureAspect() {
    for (const candidate of items) {
      if (aspect !== null) return;
      try {
        const bitmap = await createImageBitmap(candidate.file, { imageOrientation: 'from-image' });
        aspect = bitmap.height / bitmap.width;
        aspectSource = candidate;
        bitmap.close();
        syncLocked();
        return;
      } catch {
        /* not readable: try the next one */
      }
    }
  }

  function clearAll() {
    abort?.abort();
    for (const item of items) {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      revokePreview(item);
    }
    items.length = 0;
    list.replaceChildren();
    grid.replaceChildren();
    converted.clear();
    aspect = null;
    aspectSource = null;
    showNotice(null);
    showResultsAlert(null);
    clearRunError();
    refreshList();
  }

  function startOver() {
    clearAll();
    setView('setup');
  }

  // --- running ------------------------------------------------------------------------------
  async function run() {
    if (running || items.length === 0) return;
    showNotice(null);
    showResultsAlert(null);
    clearRunError();
    const options = readOptions();
    // Problems are shown right above the Resize button, with the field marked and focused.
    if (options.mode === 'dimensions' && !(options.width! > 0) && !(options.height! > 0)) {
      showRunError(tx('errors.invalid-size'), widthInput);
      return;
    }
    if (options.mode === 'percent' && !(options.percent! > 0)) {
      showRunError(tx('errors.invalid-size'), percentInput);
      return;
    }
    if (targetToggle.checked && options.targetBytes === undefined) {
      showRunError(tx('errors.invalid-limit'), targetValue);
      return;
    }

    running = true;
    runTarget = options.targetBytes;
    abort = new AbortController();
    const encoder: Encoder = createEncoder();
    currentEncoder = encoder;
    const batch = [...items]; // a snapshot: later changes to the list cannot disturb this run
    converted.clear(); // new results replace any earlier converted copies
    for (const item of items) {
      item.status = 'queued';
      item.result = undefined;
      item.error = undefined;
      item.message = undefined;
      revokePreview(item);
    }
    buildCards();
    setView('results', true);
    refreshResults();

    try {
      await runBatch(
        batch,
        options,
        (file, opts, signal) => processImage(file, opts, { encoder, signal }),
        {
          signal: abort.signal,
          onUpdate: (item) => {
            updateCard(item as ToolItem);
            refreshResults();
          },
        },
      );
    } finally {
      encoder.dispose();
      currentEncoder = null;
      running = false;
      abort = null;
    }

    for (const item of items) updateCard(item);
    refreshResults();
    refreshOptionsUI();
    const done = items.filter((i) => i.status === 'done').length;
    // Say what really happened: "all done" only when every image worked.
    say(done === items.length ? tx('result.finished') : tx('result.summary', { done, total: items.length }));
    if (done > 0) {
      // Used by the live "images resized" counter. Carries only a number.
      window.dispatchEvent(new CustomEvent('frio:resized', { detail: { count: done } }));
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void run();
  });
  cancelButton.addEventListener('click', () => {
    abort?.abort();
    // Also stop an encode that is already running (a big picture can take seconds): disposing the encoder ends it now.
    currentEncoder?.dispose();
  });
  backButton.addEventListener('click', () => {
    setView('setup');
    refreshList();
  });
  startOverButton.addEventListener('click', startOver);
  downloadAllButton.addEventListener('click', async () => {
    const finished = items.filter((i) => i.result);
    if (finished.length === 0) return;
    const original = downloadAllButton.textContent;
    downloadAllButton.disabled = true;
    downloadAllButton.textContent = tx('actions.working');
    try {
      const entries: { name: string; blob: Blob }[] = [];
      for (const item of finished) {
        const file = await fileFor(item);
        entries.push({ name: file.name, blob: file.blob });
      }
      downloadBlob(await zipFiles(entries), 'resized-images.zip');
    } catch {
      showResultsAlert(tx('errors.encode-failed'));
    } finally {
      downloadAllButton.disabled = false;
      downloadAllButton.textContent = original;
    }
  });
  saveAsSelect.addEventListener('change', () => {
    for (const item of items) updateCard(item);
  });
  q('[data-clear]').addEventListener('click', clearAll);

  // --- adding files: picker, drag and drop (anywhere on the page), paste -------------------------
  // Mouse and touch: anywhere in the drop zone opens the picker. Keyboard and screen readers use the real button.
  chooseButton.addEventListener('click', () => fileInput.click());
  drop.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('button, input')) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files) addFiles(fileInput.files);
    fileInput.value = '';
  });

  let dragDepth = 0;
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');
  window.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    dragDepth++;
    drop.classList.add('is-over');
  });
  window.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) drop.classList.remove('is-over');
  });
  window.addEventListener('dragover', (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
  window.addEventListener('drop', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    drop.classList.remove('is-over');
    if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
  });
  document.addEventListener('paste', (event) => {
    const files = event.clipboardData?.files;
    if (files && files.length > 0) addFiles(files);
  });

  // --- initial state ------------------------------------------------------------------------
  if (data.initialFormat && data.initialFormat !== 'original') formatSelect.value = data.initialFormat;
  if (data.initialMode) modeRadios.forEach((r) => (r.checked = r.value === data.initialMode));
  if (data.initialUnit) {
    unitSelect.value = data.initialUnit;
    currentUnit = data.initialUnit;
    if (data.initialDpi) dpiInput.value = String(data.initialDpi);
  }
  if (data.initialPreset) applyPreset(data.initialPreset);
  resultsView.hidden = true;
  refreshOptionsUI();
  refreshList();
}
