/**
 * Scroll-Lock hinter Portal-Overlays (Bottom Sheet / Modal).
 * Ref-Count für Nesting; iOS: position:fixed + Scroll-Restore.
 */

let lockCount = 0;
let savedScrollY = 0;
let savedBody = {
  overflow: "",
  position: "",
  top: "",
  left: "",
  right: "",
  width: "",
  paddingRight: "",
};
let savedHtmlOverflow = "";

export function lockPortalBodyScroll(): void {
  if (typeof document === "undefined") return;
  lockCount += 1;
  if (lockCount > 1) return;

  const body = document.body;
  const html = document.documentElement;
  savedScrollY = window.scrollY || window.pageYOffset || 0;
  savedHtmlOverflow = html.style.overflow;
  savedBody = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
  };

  const scrollbarGap = Math.max(0, window.innerWidth - html.clientWidth);

  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  if (scrollbarGap > 0) {
    body.style.paddingRight = `${scrollbarGap}px`;
  }
  html.classList.add("portal-modal-open");
}

export function unlockPortalBodyScroll(): void {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  const body = document.body;
  const html = document.documentElement;
  html.style.overflow = savedHtmlOverflow;
  body.style.overflow = savedBody.overflow;
  body.style.position = savedBody.position;
  body.style.top = savedBody.top;
  body.style.left = savedBody.left;
  body.style.right = savedBody.right;
  body.style.width = savedBody.width;
  body.style.paddingRight = savedBody.paddingRight;
  html.classList.remove("portal-modal-open");
  window.scrollTo(0, savedScrollY);
  window.dispatchEvent(new Event("bw:scroll-chrome-sync"));
}
