import { API_URL } from "./config";
import { clearToken, getToken } from "./session";
import type {
  AuthSession,
  DownloadFormat,
  Job,
  ReconstructionOptions,
  UploadResponse,
} from "./types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessageFrom(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  return typeof detail === "string" ? detail : `Request failed (${status})`;
}

function parseBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(path: string, status: number): void {
  if (status === 401 && !path.startsWith("/auth")) {
    clearToken();
    window.location.assign("/");
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!response.ok) {
    handleUnauthorized(path, response.status);
    const body = parseBody(await response.text());
    throw new ApiError(errorMessageFrom(body, response.status), response.status);
  }
  return response.status === 204 ? (undefined as T) : (JSON.parse(await response.text()) as T);
}

function postJson(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const api = {
  guestSession: () => request<AuthSession>("/auth/guest", { method: "POST" }),
  login: (email: string, password: string) => request<AuthSession>("/auth/login", postJson({ email, password })),
  register: (email: string, password: string) =>
    request<AuthSession>("/auth/register", postJson({ email, password })),
  listJobs: () => request<Job[]>("/jobs"),
  getJob: (jobId: string) => request<Job>(`/job-status/${jobId}`),
  startReconstruction: (uploadId: string, options: ReconstructionOptions) =>
    request<Job>("/reconstruct", postJson({ upload_id: uploadId, options })),
  deleteModel: (jobId: string) => request<void>(`/model/${jobId}`, { method: "DELETE" }),
  downloadModel: async (jobId: string, format: DownloadFormat): Promise<Blob> => {
    const response = await fetch(`${API_URL}/download/${jobId}?fmt=${format}`, { headers: authHeaders() });
    if (!response.ok) {
      throw new ApiError(`Download failed (${response.status})`, response.status);
    }
    return response.blob();
  },
};

export function uploadPhotos(files: File[], onProgress: (percent: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/upload`);
    Object.entries(authHeaders()).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const body = parseBody(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadResponse);
      } else {
        reject(new ApiError(errorMessageFrom(body, xhr.status), xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError("Network error during upload", 0));
    xhr.send(form);
  });
}
