/**
 * Browser logic for the resizer widget: drag-drop, options, presets, progress, downloads.
 * All image work is delegated to the engine (src/engine); nothing is uploaded anywhere.
 */
import {
  DEFAULT_OPTIONS,
  batchProgress,
  createEncoder,
  convertResult,
  createItems,
  downloadBlob,
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
  thumbUrl?: string;
  el?: HTMLElement;
}

const MAX_FILES = 500;

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
  const drop = q('[data-drop]');
  const fileInput = q<HTMLInputElement>('[data-file-input]');
  const notice = q('[data-notice]');
  const filesBox = q('[data-files]');
  const filesTitle = q('[data-files-title]');
  const list = q('[data-list]');
  const progress = q('[data-progress]');
  const progressBar = q('[data-progress-bar]');
  const progressText = q('[data-progress-text]');
  const live = q('[data-live]');
  const template = q<HTMLTemplateElement>('[data-item-template]');
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
  const cancelButton = q<HTMLButtonElement>('[data-cancel]');
  const downloadAllButton = q<HTMLButtonElement>('[data-download-all]');
  const resultsBar = q('[data-results-bar]');
  const saveAsSelect = q<HTMLSelectElement>('[data-saveas]');

  // --- state --------------------------------------------------------------------------------
  const items: ToolItem[] = [];
  let nextId = 1;
  let running = false;
  let abort: AbortController | null = null;
  let aspect: number | null = null; // height / width of the first image
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

  function mode(): SizeMode {
    return (modeRadios.find((r) => r.checked)?.value ?? 'dimensions') as SizeMode;
  }

  function targetBytes(): number | undefined {
    if (!targetToggle.checked) return undefined;
    const v = targetValue.valueAsNumber;
    if (!Number.isFinite(v) || v <= 0) return undefined;
    return Math.round(v * (targetUnit.value === 'MB' ? 1024 * 1024 : 1024));
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
    const dpi = dpiInput.valueAsNumber || 300;
    // Keep the same physical size when the unit changes (e.g. 1080 px -> 11.43 cm at 240 DPI).
    for (const input of [widthInput, heightInput]) {
      const v = input.valueAsNumber;
      if (Number.isFinite(v)) input.value = String(fromPixels(toPixels(v, currentUnit, dpi), next, dpi));
    }
    if (currentUnit === 'px' && next !== 'px' && (dpiInput.valueAsNumber || 0) < 150) dpiInput.value = '300';
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

  // --- file list ----------------------------------------------------------------------------
  function describe(item: ToolItem): string {
    if (item.status === 'done' && item.result) {
      const r = item.result;
      const saved = 1 - r.outputBytes / Math.max(1, r.originalBytes);
      const change =
        saved > 0.005
          ? tx('result.smaller', { percent: `${Math.round(saved * 100)}%` })
          : tx('result.larger', { percent: `${Math.round(Math.abs(saved) * 100)}%` });
      return `${formatNumber(lang, r.width, 0)} × ${formatNumber(lang, r.height, 0)} px · ${formatBytes(lang, r.originalBytes)} → ${formatBytes(lang, r.outputBytes)} (${change})`;
    }
    return formatBytes(lang, item.file.size);
  }

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

    const key = `${item.id}:${format}`;
    const cached = converted.get(key);
    if (cached) return cached;

    const encoder = createEncoder();
    try {
      const file = await convertResult(result, format, encoder, {
        quality: Math.min(1, Math.max(0.1, (qualityInput.valueAsNumber || 90) / 100)),
      });
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
      showNotice(tx('errors.encode-failed'));
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function updateItem(item: ToolItem) {
    const el = item.el;
    if (!el) return;
    el.dataset.state = item.status;
    (el.querySelector('[data-name]') as HTMLElement).textContent = item.file.name;
    (el.querySelector('[data-meta]') as HTMLElement).textContent = describe(item);
    (el.querySelector('[data-status]') as HTMLElement).textContent = tx(`status.${item.status}`);
    const dl = el.querySelector('[data-download]') as HTMLButtonElement;
    dl.hidden = !(item.status === 'done' && item.result);
    if (item.result) dl.textContent = downloadLabel(item);
    const err = el.querySelector('[data-error]') as HTMLElement;
    let message = '';
    if (item.status === 'error') message = tx(`errors.${item.error ?? 'encode-failed'}`);
    else if (item.status === 'done' && item.result && item.result.reachedTarget === false) {
      const target = targetBytes();
      message = tx('result.targetMissed', {
        target: target ? formatBytes(lang, target) : '',
        size: formatBytes(lang, item.result.outputBytes),
      });
    }
    err.hidden = !message;
    err.textContent = message;
    const removeButton = el.querySelector('[data-remove]') as HTMLButtonElement;
    removeButton.setAttribute('aria-label', tx('files.remove', { name: item.file.name }));
    removeButton.disabled = running && item.status === 'processing';
  }

  function updateProgress() {
    const p = batchProgress(items);
    progress.hidden = !running && p.finished === 0;
    progressBar.style.width = `${Math.round(p.fraction * 100)}%`;
    progressText.textContent = tx('result.summary', { done: p.finished, total: p.total });
  }

  function refreshList() {
    const has = items.length > 0;
    root.classList.toggle('has-files', has);
    filesBox.hidden = !has;
    filesTitle.textContent = tx('files.title', { count: items.length });
    const doneCount = items.filter((i) => i.status === 'done').length;
    resultsBar.hidden = doneCount === 0;
    downloadAllButton.hidden = running || doneCount < 2;
    cancelButton.hidden = !running;
    runButton.hidden = running;
    refreshOptionsUI();
  }

  async function makeThumb(item: ToolItem) {
    try {
      let bitmap: ImageBitmap;
      if (item.el && aspect === null && items[0] === item) {
        // The first image defines the locked aspect ratio, so read its exact size (full decode, once).
        bitmap = await createImageBitmap(item.file, { imageOrientation: 'from-image' });
        aspect = bitmap.height / bitmap.width;
        syncLocked();
      } else {
        try {
          bitmap = await createImageBitmap(item.file, { resizeWidth: 112, resizeQuality: 'low', imageOrientation: 'from-image' });
        } catch {
          bitmap = await createImageBitmap(item.file);
        }
      }
      const scale = Math.min(1, 112 / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const tctx = canvas.getContext('2d')!;
      tctx.fillStyle = '#f1f4f9'; // light backdrop so transparent images don't turn black in the thumbnail
      tctx.fillRect(0, 0, canvas.width, canvas.height);
      tctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7));
      canvas.width = 0;
      if (blob && item.el) {
        item.thumbUrl = URL.createObjectURL(blob);
        (item.el.querySelector('img') as HTMLImageElement).src = item.thumbUrl;
      }
    } catch {
      /* no thumbnail: the row still works */
    }
  }

  function addFiles(files: ArrayLike<File>) {
    showNotice(null);
    const incoming = Array.from(files).filter((f) => looksLikeImage(f));
    if (incoming.length === 0) {
      if (files.length > 0) showNotice(tx('drop.none'));
      return;
    }
    const room = Math.max(0, MAX_FILES - items.length);
    const created = createItems(incoming.slice(0, room), nextId) as ToolItem[];
    nextId += created.length;
    for (const item of created) {
      const node = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
      item.el = node;
      node.dataset.id = String(item.id);
      node.querySelector('[data-remove]')!.addEventListener('click', () => removeItem(item));
      node.querySelector('[data-download]')!.addEventListener('click', (event) => {
        void downloadOne(item, event.currentTarget as HTMLButtonElement);
      });
      list.appendChild(node);
      items.push(item);
      updateItem(item);
      thumbChain = thumbChain.then(() => makeThumb(item));
    }
    refreshList();
    updateProgress();
  }

  function removeItem(item: ToolItem) {
    if (item.status === 'processing') return;
    const index = items.indexOf(item);
    if (index < 0) return;
    items.splice(index, 1);
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    item.el?.remove();
    if (items.length === 0) aspect = null;
    refreshList();
    updateProgress();
  }

  function clearAll() {
    abort?.abort();
    for (const item of items) {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      item.el?.remove();
    }
    items.length = 0;
    aspect = null;
    showNotice(null);
    refreshList();
    updateProgress();
  }

  // --- running ------------------------------------------------------------------------------
  async function run() {
    if (running || items.length === 0) return;
    showNotice(null);
    const options = readOptions();
    if (
      (options.mode === 'dimensions' && !(options.width! > 0) && !(options.height! > 0)) ||
      (options.mode === 'percent' && !(options.percent! > 0))
    ) {
      showNotice(tx('errors.invalid-size'));
      return;
    }

    running = true;
    abort = new AbortController();
    const encoder: Encoder = createEncoder();
    converted.clear(); // new results replace any earlier converted copies
    for (const item of items) {
      item.status = 'queued';
      item.result = undefined;
      item.error = undefined;
      item.message = undefined;
      updateItem(item);
    }
    refreshList();
    updateProgress();

    try {
      await runBatch(
        items,
        options,
        (file, opts, signal) => processImage(file, opts, { encoder, signal }),
        {
          signal: abort.signal,
          onUpdate: (item) => {
            updateItem(item as ToolItem);
            updateProgress();
          },
        },
      );
    } finally {
      encoder.dispose();
      running = false;
      abort = null;
    }

    const done = items.filter((i) => i.status === 'done').length;
    refreshList();
    for (const item of items) updateItem(item);
    updateProgress();
    if (done > 0) {
      say(tx('result.finished', { count: done }));
      // Used by the live "images resized" counter (Step 7). Carries only a number.
      window.dispatchEvent(new CustomEvent('frio:resized', { detail: { count: done } }));
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void run();
  });
  cancelButton.addEventListener('click', () => abort?.abort());
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
      showNotice(tx('errors.encode-failed'));
    } finally {
      downloadAllButton.disabled = false;
      downloadAllButton.textContent = original;
    }
  });
  saveAsSelect.addEventListener('change', () => {
    for (const item of items) updateItem(item);
  });
  q('[data-clear]').addEventListener('click', clearAll);

  // --- adding files: picker, drag and drop (anywhere on the page), paste -------------------------
  drop.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('label, input')) return;
    fileInput.click();
  });
  drop.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
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
  refreshOptionsUI();
  refreshList();
}
