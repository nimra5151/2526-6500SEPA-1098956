import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API Error type for better error handling
export interface ApiError extends Error {
  code?: string;
  status?: number;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      const message = data.message || `${res.status}: ${res.statusText}`;
      throw Object.assign(new Error(message), { code: data.code, status: res.status });
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw Object.assign(new Error(`${res.status}: ${text || res.statusText}`), { status: res.status }) as ApiError;
      }
      throw e;
    }
  }
}

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: T,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
