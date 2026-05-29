export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const buildQueryString = (params: Record<string, any>) => {
  const cleanParams: Record<string, string> = {};

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      cleanParams[key] = String(value);
    }
  });

  return new URLSearchParams(cleanParams).toString();
};
