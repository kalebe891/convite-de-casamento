/**
 * Development-only logger helpers.
 * `console.error` continues to be used directly for real errors.
 */
const isDev = import.meta.env.DEV;

export const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

export const devWarn = (...args: unknown[]) => {
  if (isDev) console.warn(...args);
};

export const devInfo = (...args: unknown[]) => {
  if (isDev) console.info(...args);
};
