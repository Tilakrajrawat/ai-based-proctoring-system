export type SafeResult<T> = {
    ok: boolean;
    data: T | null;
    status: number;
  };
  
  export async function safeFetch<T>(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<SafeResult<T>> {
    try {
      const res = await fetch(input, init);
  
      if (!res.ok) {
        return { ok: false, data: null, status: res.status };
      }
  
      const text = await res.text();
      if (!text) {
        return { ok: true, data: null, status: res.status };
      }
  
      return {
        ok: true,
        data: JSON.parse(text) as T,
        status: res.status,
      };
    } catch {
      return { ok: false, data: null, status: 0 };
    }
  }