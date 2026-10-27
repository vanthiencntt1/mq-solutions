// Gọi API nội bộ từ trình duyệt – đọc đúng định dạng { data } / { error } (00-CONG-NGHE-QUY-UOC mục 6).

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body ? 'POST' : 'GET'),
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('NETWORK', 'Không kết nối được máy chủ, vui lòng kiểm tra mạng', 0);
  }
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { code: string; message: string; details?: unknown };
  };
  if (!res.ok || json.error) {
    throw new ApiError(
      json.error?.code ?? 'INTERNAL',
      json.error?.message ?? 'Hệ thống đang bận',
      res.status,
      json.error?.details,
    );
  }
  return json.data as T;
}
