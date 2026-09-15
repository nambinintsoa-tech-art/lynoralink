export const APP_ORIGIN = "https://app.lynoralink.com";

export function appUrl(pathname = "/") {
  return `${APP_ORIGIN}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
