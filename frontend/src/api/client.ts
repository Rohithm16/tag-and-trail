const BASE_URL = "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("tt_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string;
  token_type: string;
  email: string;
  name: string | null;
}

export const api = {
  auth: {
    signup: (email: string, password: string, name?: string) =>
      request<AuthResponse>("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name ?? "" }),
      }),

    login: (email: string, password: string) =>
      request<AuthResponse>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),

    me: () => request<{ email: string; name: string | null }>("/api/auth/me"),

    updateProfile: (name: string, email: string) =>
      request<{ email: string; name: string | null }>("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, email }),
      }),
  },

  documents: {
    uploadUrl: (url: string) => {
      const form = new FormData();
      form.append("url", url);
      return request<Document>("/api/documents/upload", { method: "POST", body: form });
    },

    uploadPdf: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<Document>("/api/documents/upload", { method: "POST", body: form });
    },

    list: () => request<Document[]>("/api/documents/"),
    stats: () => request<Stats>("/api/documents/stats"),
    trash: () => request<Document[]>("/api/documents/trash"),

    softDelete: (id: string) =>
      request<{ message: string }>(`/api/documents/${id}`, { method: "DELETE" }),

    restore: (id: string) =>
      request<Document>(`/api/documents/${id}/restore`, { method: "POST" }),

    hardDelete: (id: string) =>
      request<{ message: string }>(`/api/documents/${id}/permanent`, { method: "DELETE" }),
  },
};

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  title: string | null;
  description: string | null;
  source_type: "pdf" | "link";
  source_url: string | null;
  tags: string[];
  is_malicious: boolean;
  prediction: string | null;
  risk_level: string | null;
  malicious_probability: number | null;
  vt_stats: Record<string, number> | null;
  flags: string[];
  is_deleted: boolean;
  created_at: string;
}

export interface Stats {
  total_indexed: number;
  links: number;
  documents: number;
  open_count: number;
  private_count: number;
  malicious_count: number;
}
