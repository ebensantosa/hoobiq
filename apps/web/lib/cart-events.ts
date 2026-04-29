/**
 * Tiny pub/sub for "cart contents changed" — used to keep the nav badge
 * in sync with mutations from anywhere on the page (cart button on a
 * listing card, qty stepper on /keranjang, etc.) without each surface
 * having to import a context.
 *
 * Implementation: a CustomEvent on window. Cheap, framework-free, and
 * survives across the whole client tree because window is the one
 * shared anchor between server-rendered server components and the
 * client islands inside them.
 */

const EVENT = "hoobiq:cart:changed";

export function emitCartChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onCartChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
