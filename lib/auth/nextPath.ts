const PLACEHOLDER_ORIGIN = "http://same-origin.invalid";

/**
 * Returns `value` if it's a same-origin path (starts with `/`, not `//`), else `/`.
 * Resolving against a placeholder origin catches tricks like `/\evil.com` too.
 */
export function toSafeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";

  const url = new URL(value, PLACEHOLDER_ORIGIN);
  if (url.origin !== PLACEHOLDER_ORIGIN) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
