/**
 * Browser logic of the "images to PDF" widget: add pictures, put them in order, choose the page, create one PDF.
 * Nothing is uploaded: pictures are read with the engine, turned into JPEGs on a canvas and written into a PDF here.
 */
import { buildPdf, decodeImage, downloadBlob, looksLikeImage, planPage, type PdfOptions, type PdfPicture } from '../../engine';
import { baseName } from '../../engine/naming';
import { formatBytes, formatNumber } from '../../i18n/format';
import { LIST_THUMBNAIL_EDGE, makeThumbnail } from './thumbnail';

interface PdfItem {
  id: number;
  file: File;
  el: HTMLElement;
  thumbUrl?: string;
}

const MAX_PAGES = 100;
/** Picture quality of the three choices: JPEG quality and the longest side in pixels (A4 at 300 / about 210 / 150 DPI). */
const QUALITY = {
  high: { quality: 0.92, side: 3508 },
  balanced: { quality: 0.8, side: 2480 },
  low: { quality: 0.65, side: 1754 },
} as const;
const MARGIN = { none: 0, small: 18, big: 36 } as const;
/** Width in pixels of a finished-page preview: sharp when shown about 170 px wide on a screen with twice the pixel density. */
const PAGE_PREVIEW_WIDTH = 420;

export function initPdf(root: HTMLElement): void {
  const data = JSON.parse(root.querySelector('[data-pdf-data]')!.textContent || '{}') as { lang: string; text: Record<string, unknown> };
  const lang = data.lang;
  const q = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;

  function tx(path: string, vars?: Record<string, string | number>): string {
    let node: unknown = data.text;
    for (const part of path.split('.')) {
      if (typeof node !== 'object' || node === null) return path;
      node = (node as Record<string, unknown>)[part];
    }
    if (typeof node !== 'string') return path;
    return vars ? node.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : node;
  }

  const setupView = q('[data-setup]');
  const resultView = q('[data-result]');
  const drop = q('[data-drop]');
  const fileInput = q<HTMLInputElement>('[data-file-input]');
  const chooseButton = q<HTMLButtonElement>('[data-choose]');
  const notice = q('[data-notice]');
  const filesBox = q('[data-files]');
  const filesTitle = q('[data-files-title]');
  const list = q('[data-list]');
  const rowTemplate = q<HTMLTemplateElement>('[data-row-template]');
  const form = q<HTMLFormElement>('[data-options]');
  const pageSize = q<HTMLSelectElement>('[data-page-size]');
  const orientation = q<HTMLSelectElement>('[data-orientation]');
  const margin = q<HTMLSelectElement>('[data-margin]');
  const quality = q<HTMLSelectElement>('[data-quality]');
  const errorBox = q('[data-error]');
  const createButton = q<HTMLButtonElement>('[data-create]');
  const live = q('[data-live]');
  const resultInfo = q('[data-result-info]');
  const downloadButton = q<HTMLButtonElement>('[data-download]');
  const backButton = q<HTMLButtonElement>('[data-back]');
  const againButton = q<HTMLButtonElement>('[data-again]');
  const overlay = root.querySelector<HTMLElement>('[data-drop-overlay]');
  const pagesBox = q('[data-pages-box]');
  const pagesTitle = q('[data-pages-title]');
  const pagesList = q('[data-pages]');
  const pageTemplate = q<HTMLTemplateElement>('[data-page-template]');
  const previewUrls: string[] = [];
  let previewToken = 0;

  const items: PdfItem[] = [];
  let nextId = 1;
  let running = false;
  let thumbChain: Promise<void> = Promise.resolve();
  let pdfBlob: Blob | null = null;
  let pdfName = 'images.pdf';

  function say(message: string) {
    live.textContent = message;
  }
  function showNotice(message: string | null) {
    notice.hidden = !message;
    notice.textContent = message ?? '';
  }
  function showError(message: string | null) {
    errorBox.hidden = !message;
    errorBox.textContent = message ?? '';
  }

  function refreshList() {
    const has = items.length > 0;
    root.classList.toggle('has-files', has);
    filesBox.hidden = !has;
    filesTitle.textContent = tx('pdf.list.title', { count: items.length });
    createButton.disabled = !has || running;
    items.forEach((item, i) => {
      const up = item.el.querySelector<HTMLButtonElement>('[data-up]')!;
      const down = item.el.querySelector<HTMLButtonElement>('[data-down]')!;
      up.disabled = i === 0;
      down.disabled = i === items.length - 1;
      item.el.querySelector('[data-page-no]')!.textContent = String(i + 1);
    });
  }

  async function makeThumb(item: PdfItem) {
    try {
      // white backdrop: transparent parts become white on the PDF page too
      const blob = await makeThumbnail(item.file, LIST_THUMBNAIL_EDGE, '#ffffff');
      if (blob && items.includes(item)) {
        item.thumbUrl = URL.createObjectURL(blob);
        const img = item.el.querySelector('img');
        if (img) img.src = item.thumbUrl;
      }
    } catch {
      /* no thumbnail: the row still works */
    }
  }

  function removeItem(item: PdfItem) {
    if (running) return;
    const at = items.indexOf(item);
    if (at < 0) return;
    items.splice(at, 1);
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    item.el.remove();
    refreshList();
  }

  function move(item: PdfItem, by: -1 | 1) {
    if (running) return;
    const at = items.indexOf(item);
    const to = at + by;
    if (at < 0 || to < 0 || to >= items.length) return;
    items.splice(at, 1);
    items.splice(to, 0, item);
    const other = items[at]!.el;
    if (by === -1) list.insertBefore(item.el, other);
    else list.insertBefore(item.el, other.nextSibling);
    refreshList();
    item.el.querySelector<HTMLButtonElement>(by === -1 ? '[data-up]' : '[data-down]')?.focus({ preventScroll: true });
  }

  function addFiles(files: ArrayLike<File>) {
    if (running) return;
    showNotice(null);
    showError(null);
    const all = Array.from(files);
    const incoming = all.filter((f) => looksLikeImage(f));
    const skipped = all.length - incoming.length;
    const accepted = incoming.slice(0, Math.max(0, MAX_PAGES - items.length));
    const tooMany = incoming.length - accepted.length;
    const notes: string[] = [];
    if (accepted.length === 0 && tooMany === 0 && all.length > 0) notes.push(tx('drop.none'));
    else if (skipped > 0) notes.push(tx('drop.skipped', { count: skipped }));
    if (tooMany > 0) notes.push(tx('drop.tooMany', { max: MAX_PAGES }));
    if (notes.length > 0) showNotice(notes.join(' '));
    if (accepted.length === 0) return;

    if (!resultView.hidden) showSetup();
    for (const file of accepted) {
      const el = rowTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
      const item: PdfItem = { id: nextId++, file, el };
      el.querySelector('[data-name]')!.textContent = file.name;
      el.querySelector('[data-meta]')!.textContent = formatBytes(lang, file.size);
      const name = file.name;
      el.querySelector('[data-up]')!.setAttribute('aria-label', tx('pdf.list.up', { name }));
      el.querySelector('[data-down]')!.setAttribute('aria-label', tx('pdf.list.down', { name }));
      el.querySelector('[data-remove]')!.setAttribute('aria-label', tx('files.remove', { name }));
      el.querySelector('[data-up]')!.addEventListener('click', () => move(item, -1));
      el.querySelector('[data-down]')!.addEventListener('click', () => move(item, 1));
      el.querySelector('[data-remove]')!.addEventListener('click', () => removeItem(item));
      list.appendChild(el);
      items.push(item);
      thumbChain = thumbChain.then(() => makeThumb(item));
    }
    refreshList();
  }

  /** One picture as a JPEG for the PDF: upright, on white, no larger than the chosen quality needs. */
  async function toPicture(file: File): Promise<PdfPicture> {
    const { bitmap, width, height } = await decodeImage(file);
    const { quality: jpegQuality, side } = QUALITY[quality.value as keyof typeof QUALITY] ?? QUALITY.high;
    const scale = Math.min(1, side / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#ffffff'; // a JPEG has no transparency
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.imageSmoothingQuality = 'high';
    c.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', jpegQuality));
    const pictureWidth = canvas.width;
    const pictureHeight = canvas.height;
    canvas.width = 0;
    if (!blob) throw new Error('encode');
    return { jpeg: new Uint8Array(await blob.arrayBuffer()), width: pictureWidth, height: pictureHeight };
  }

  function setBusy(busy: boolean) {
    running = busy;
    root.classList.toggle('is-busy', busy);
    createButton.disabled = busy || items.length === 0;
    for (const control of [pageSize, orientation, margin, quality]) control.disabled = busy;
  }

  async function create() {
    if (running) return;
    if (items.length === 0) {
      showError(tx('pdf.errors.empty'));
      return;
    }
    showError(null);
    showNotice(null);
    setBusy(true);
    const options: PdfOptions = {
      pageSize: pageSize.value as PdfOptions['pageSize'],
      orientation: orientation.value as PdfOptions['orientation'],
      margin: MARGIN[margin.value as keyof typeof MARGIN] ?? 0,
    };
    const pictures: PdfPicture[] = [];
    try {
      for (let i = 0; i < items.length; i++) {
        const message = tx('pdf.actions.working', { done: i + 1, total: items.length });
        createButton.textContent = message;
        say(message);
        try {
          pictures.push(await toPicture(items[i]!.file));
        } catch {
          showError(tx('pdf.errors.unreadable', { name: items[i]!.file.name }));
          return;
        }
      }
      const bytes = buildPdf(pictures, options);
      pdfBlob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      pdfName = items.length === 1 ? `${baseName(items[0]!.file.name)}.pdf` : 'images.pdf';
      resultInfo.textContent = tx('pdf.result.info', { pages: formatNumber(lang, pictures.length, 0), size: formatBytes(lang, pdfBlob.size) });
      say(tx('pdf.result.title'));
      setupView.hidden = true;
      resultView.hidden = false;
      root.dataset.view = 'result';
      resultView.querySelector<HTMLElement>('[data-result-title]')?.focus();
      void renderPagePreviews(pictures.slice(), options); // the loop below clears `pictures`; the previews keep their own list
    } catch {
      showError(tx('pdf.errors.failed'));
    } finally {
      pictures.length = 0;
      createButton.textContent = tx('pdf.actions.create');
      setBusy(false);
    }
  }

  /**
   * The strip of finished pages under the Download button: every page drawn the way it is in the PDF (page size, direction, margin,
   * the picture placed and scaled exactly as planPage says), one after the other so only one big picture is decoded at a time.
   */
  async function renderPagePreviews(pictures: PdfPicture[], options: PdfOptions) {
    clearPagePreviews(); // also invalidates a render that is still running
    const token = previewToken;
    pagesBox.hidden = false;
    pagesTitle.textContent = tx('pdf.list.title', { count: formatNumber(lang, pictures.length, 0) });
    const cells = pictures.map((picture, i) => {
      const cell = pageTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
      const plan = planPage(picture, options);
      cell.querySelector<HTMLElement>('.pg__sheet')!.style.aspectRatio = `${plan.pageWidth} / ${plan.pageHeight}`; // no jump when the picture arrives
      cell.querySelector<HTMLElement>('[data-caption]')!.textContent = tx('pdf.result.page', { n: formatNumber(lang, i + 1, 0) });
      pagesList.append(cell);
      return { cell, plan };
    });
    for (let i = 0; i < pictures.length; i++) {
      if (token !== previewToken) return; // the pages were changed or the result was closed meanwhile
      try {
        const { plan } = cells[i]!;
        const picture = await createImageBitmap(new Blob([pictures[i]!.jpeg as BlobPart], { type: 'image/jpeg' }));
        const scale = PAGE_PREVIEW_WIDTH / plan.pageWidth;
        const canvas = document.createElement('canvas');
        canvas.width = PAGE_PREVIEW_WIDTH;
        canvas.height = Math.max(1, Math.round(plan.pageHeight * scale));
        const c = canvas.getContext('2d')!;
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.imageSmoothingQuality = 'high';
        // planPage measures from the bottom edge (PDF), a canvas from the top
        c.drawImage(picture, plan.x * scale, (plan.pageHeight - plan.y - plan.height) * scale, plan.width * scale, plan.height * scale);
        picture.close();
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
        canvas.width = 0;
        if (blob && token === previewToken) {
          const url = URL.createObjectURL(blob);
          previewUrls.push(url);
          cells[i]!.cell.querySelector('img')!.src = url;
        }
      } catch {
        /* no preview for this page: the PDF itself is fine */
      }
    }
  }

  function clearPagePreviews() {
    previewToken++;
    for (const url of previewUrls) URL.revokeObjectURL(url);
    previewUrls.length = 0;
    pagesList.replaceChildren();
    pagesBox.hidden = true;
  }

  function showSetup() {
    clearPagePreviews();
    resultView.hidden = true;
    setupView.hidden = false;
    root.dataset.view = 'setup';
  }

  function startOver() {
    for (const item of [...items]) {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      item.el.remove();
    }
    items.length = 0;
    pdfBlob = null;
    showSetup();
    showError(null);
    showNotice(null);
    refreshList();
  }

  // --- wiring -------------------------------------------------------------------------------
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void create();
  });
  downloadButton.addEventListener('click', () => {
    if (pdfBlob) downloadBlob(pdfBlob, pdfName);
  });
  backButton.addEventListener('click', showSetup);
  againButton.addEventListener('click', startOver);
  q('[data-clear]').addEventListener('click', () => {
    if (!running) startOver();
  });
  chooseButton.addEventListener('click', () => fileInput.click());
  drop.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('button')) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files) addFiles(fileInput.files);
    fileInput.value = '';
  });

  // Files dropped anywhere on the window, or pasted
  let dragDepth = 0;
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');
  if (overlay) document.body.append(overlay);
  const setOver = (on: boolean) => {
    drop.classList.toggle('is-over', on);
    if (overlay) overlay.hidden = !on;
  };
  window.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    dragDepth++;
    setOver(true);
  });
  window.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) setOver(false);
  });
  window.addEventListener('dragover', (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
  window.addEventListener('drop', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    setOver(false);
    if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
  });
  document.addEventListener('paste', (event) => {
    const files = event.clipboardData?.files;
    if (files && files.length > 0) addFiles(files);
  });

  refreshList();
}
