type StatusHookFn = (error: any) => void | Promise<void>;

interface StatusHook {
  status: number;
  fn: StatusHookFn;
}

const globalStatusHooks: StatusHook[] = [];

export const registerStatusHook = (status: number, fn: StatusHookFn) => {
  globalStatusHooks.push({ status, fn });
};

export const runStatusHooks = async (status: number, error: any) => {
  for (const hook of globalStatusHooks) {
    if (hook.status === status) {
      await hook.fn(error);
    }
  }
};
