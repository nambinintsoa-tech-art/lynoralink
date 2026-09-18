export function canUsePullToRefresh({ pointerType, coarsePointer = false } = {}) {
  if (pointerType === "touch" || pointerType === "pen") return true;
  if (pointerType === "mouse") return false;
  return Boolean(coarsePointer);
}

export function getFeedReloadTarget(currentUrl) {
  const url = currentUrl instanceof URL ? currentUrl : new URL(currentUrl || "http://localhost");
  const targetPath = url.pathname === "/" ? "/feed" : (url.pathname.startsWith("/feed") ? url.pathname : "/feed");
  const targetQuery = url.search || "";
  return `${url.origin}${targetPath}${targetQuery}`;
}
