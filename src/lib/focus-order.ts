export type Box = { top: number; right: number; left: number; width: number; height: number };

/** راست به چپ، ردیف به ردیف. فیلد سمت راست در یک ردیف جلوتر است. */
export function compareVisualRtl(a: Box, b: Box): number {
  const rowA = Math.round(a.top / 16);
  const rowB = Math.round(b.top / 16);
  if (rowA !== rowB) return rowA - rowB;
  const rightDelta = b.right - a.right;
  if (Math.abs(rightDelta) > 1) return rightDelta;
  return a.left - b.left;
}

export function isCycleField(el: HTMLElement): boolean {
  if (el.closest("[data-entry-skip]")) return false;
  if ((el as HTMLInputElement).disabled) return false;
  if (el.getAttribute("type") === "hidden") return false;
  if (el.tabIndex < 0) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  return true;
}

export function cycleFields(root: ParentNode): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>("input, select, textarea"));
  return nodes.filter(isCycleField).sort((a, b) => compareVisualRtl(a.getBoundingClientRect(), b.getBoundingClientRect()));
}

export function moveFocus(root: HTMLElement, from: HTMLElement, dir: 1 | -1) {
  const fields = cycleFields(root);
  if (!fields.length) return;
  const index = fields.indexOf(from);
  const next = index < 0 ? fields[dir === 1 ? 0 : fields.length - 1] : fields[(index + dir + fields.length) % fields.length];
  focusField(next);
}

export function focusField(el: HTMLElement | null) {
  if (!el) return;
  el.focus();
  if (el instanceof HTMLInputElement && el.type !== "checkbox" && el.type !== "radio") el.select();
}

export function focusMarked(root: ParentNode, selector: string) {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) return false;
  focusField(el);
  return true;
}
