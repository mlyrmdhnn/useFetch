let isProduction = false;

export const logger = {
  setProduction(value: boolean) {
    isProduction = value;
  },

  log(...args: any[]) {
    if (isProduction) return;

    console.log("%c[Nexus-Info]", "color:#10b981;font-weight:bold", ...args);
  },

  warn(...args: any[]) {
    if (isProduction) return;

    console.warn("%c[Nexus-Warn]", "color:#f59e0b;font-weight:bold", ...args);
  },

  error(...args: any[]) {
    if (isProduction) return;

    console.error("%c[Nexus-Error]", "color:#ef4444;font-weight:bold", ...args);
  },
};
