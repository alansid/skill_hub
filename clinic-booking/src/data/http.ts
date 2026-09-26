// 與雲端後端（Cloudflare）溝通的共用工具

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const FALLBACK: Record<string, string> = {
  unauthorized: '請重新登入。',
  network: '網路連線有問題，請確認網路後再試一次。',
  server: '系統暫時有問題，請稍後再試。',
};

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('network', FALLBACK.network, 0);
  }
  let data: { error?: string; message?: string } & Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    // 沒有內容
  }
  if (!res.ok) {
    const code = data.error ?? (res.status === 401 ? 'unauthorized' : 'server');
    throw new ApiError(code, data.message ?? FALLBACK[code] ?? FALLBACK.server, res.status);
  }
  return data as T;
}
