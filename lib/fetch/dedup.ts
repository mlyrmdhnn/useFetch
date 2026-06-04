/**
 * Request deduplication.
 * If the same request is already in-flight,
 * return the existing promise instead of firing a new one.
 */
const pendingRequests = new Map<string, Promise<any>>();

export const buildDedupKey = (
  endpoint: string,
  method: string,
  params: Record<string, any>
): string => {
  return `${method}:${endpoint}:${JSON.stringify(params)}`;
};

export const getDedupRequest = (key: string): Promise<any> | undefined => {
  return pendingRequests.get(key);
};

export const setDedupRequest = (key: string, promise: Promise<any>): void => {
  pendingRequests.set(key, promise);
};

export const deleteDedupRequest = (key: string): void => {
  pendingRequests.delete(key);
};
