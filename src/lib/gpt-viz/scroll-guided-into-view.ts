/** Scrollt Guided-Blöcke (PLZ, Lead) ins sichtbare Viewport — wichtig bei geöffneter Tastatur. */
export function scrollGuidedBlockIntoView(node: HTMLElement | null): void {
  if (!node || typeof window === "undefined") return;
  const run = () => {
    node.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  requestAnimationFrame(run);
  window.setTimeout(run, 150);
  window.setTimeout(run, 400);
}
