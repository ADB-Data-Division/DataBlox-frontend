/**
 * DataBlox Coastal Upload Portal Admin Service.
 * Typed client for the /api/v1/admin/coastal endpoints plus the
 * allowlisted /countries view. All calls send Authorization Bearer via
 * the session token and throw Coastal Admin Error (status): detail.
 */

import type { CoastalCountry } from "../types/coastal";
import { getClientAccessToken } from "@/app/lib/auth-utils";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://api.sapalo.dev";

const ADMIN_BASE = `${API_BASE_URL}/api/v1/admin/coastal`;

export const CHUNK_SIZE_BYTES = 8 * 1024 * 1024;

export interface AdminCountry extends CoastalCountry {
  enabled?: boolean;
}

export interface SessionFileIn {
  name: string;
  size_bytes: number;
}

export interface SessionFileState extends SessionFileIn {
  received_bytes: number;
  complete: boolean;
}

export interface AdminUploadSession {
  upload_id: string;
  iso: string;
  status: string;
  created_by: string;
  created_at: string;
  files: SessionFileState[];
}

export interface ReviewIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  hint: string;
  sample: unknown[][];
}

export interface SessionReview {
  mode: "new" | "overwrite";
  files: SessionFileState[];
  kinds: Record<string, { name: string }>;
  errors: ReviewIssue[];
  warnings: ReviewIssue[];
  info: Record<string, any>;
  readiness: boolean;
}

export interface SessionWithReview extends AdminUploadSession {
  review: SessionReview;
}

export interface PublishReceipt {
  upload_id: string;
  iso: string;
  mode: string;
  backup_path: string;
  published_at: string;
  prod_before: Record<string, { rows: number }>;
  prod_after: Record<string, { rows: number }>;
  smoke: Record<string, unknown>;
  enabled: boolean;
}

export interface PublishParams {
  mode: "overwrite" | "new";
  country_name: string;
  note: string;
}

async function resolveAuthToken(explicitToken?: string): Promise<string | null> {
  if (explicitToken) return explicitToken;
  try {
    return await getClientAccessToken();
  } catch {
    return null;
  }
}

function adminError(status: number, statusText: string, detail: unknown): Error {
  const detailText =
    typeof detail === "string" ? detail : JSON.stringify(detail ?? statusText);
  return new Error(`Coastal Admin Error (${status}): ${detailText}`);
}

async function throwForResponse(response: Response): Promise<never> {
  let detail: unknown = response.statusText;
  try {
    const errJson = await response.json();
    detail = errJson.detail || detail;
  } catch {
    // Use statusText fallback
  }
  throw adminError(response.status, response.statusText, detail);
}

async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const authToken = await resolveAuthToken(token);
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(init.headers || {}),
  };
  if (authToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
  }
  const response = await fetch(`${ADMIN_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    await throwForResponse(response);
  }
  return response.json() as Promise<T>;
}

export async function checkAllowed(token?: string): Promise<{ allowed: boolean; email: string | null }> {
  return adminFetch("/whoami", {}, token);
}

export async function fetchAdminCountries(
  includeDisabled = true,
  token?: string
): Promise<AdminCountry[]> {
  const authToken = await resolveAuthToken(token);
  const headers: HeadersInit = { Accept: "application/json" };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const url = new URL(`${API_BASE_URL}/api/v1/coastal/countries`);
  if (includeDisabled) {
    url.searchParams.append("include_disabled", "true");
  }
  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    await throwForResponse(response);
  }
  return response.json() as Promise<AdminCountry[]>;
}

export async function initUpload(
  iso: string,
  files: SessionFileIn[],
  token?: string
): Promise<AdminUploadSession> {
  return adminFetch<AdminUploadSession>(
    "/uploads",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iso, files }),
    },
    token
  );
}

export async function fetchUpload(
  uploadId: string,
  revalidate = false,
  token?: string
): Promise<SessionWithReview> {
  const suffix = revalidate ? "?revalidate=true" : "";
  return adminFetch<SessionWithReview>(`/uploads/${uploadId}${suffix}`, {}, token);
}

async function putChunk(
  uploadId: string,
  fileName: string,
  offset: number,
  body: Blob,
  token?: string
): Promise<SessionFileState & { upload_id: string; file: string }> {
  const url =
    `${ADMIN_BASE}/uploads/${uploadId}/chunks` +
    `?file=${encodeURIComponent(fileName)}&offset=${offset}`;
  const authToken = await resolveAuthToken(token);
  const headers: HeadersInit = { "Content-Type": "application/octet-stream" };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const response = await fetch(url, { method: "PUT", headers, body });
  if (response.status === 409) {
    const conflict = (await response.json()) as {
      detail: { received_bytes: number };
    };
    const err = new Error("__resume__");
    (err as any).receivedBytes = conflict.detail.received_bytes;
    throw err;
  }
  if (!response.ok) {
    await throwForResponse(response);
  }
  return response.json();
}

/**
 * Upload one file in 8 MB chunks with resume. Reads the server's received
 * bytes first, so a retry continues where it stopped. Progress callback
 * receives uploaded bytes and total size.
 */
export async function uploadChunks(
  uploadId: string,
  fileName: string,
  file: Blob,
  onProgress?: (uploaded: number, total: number) => void,
  token?: string
): Promise<void> {
  let session = await fetchUpload(uploadId, false, token);
  let entry = session.files.find((f) => f.name === fileName);
  if (!entry) {
    throw new Error(`Coastal Admin Error: ${fileName} is not part of this session`);
  }
  let offset = entry.received_bytes;
  onProgress?.(offset, entry.size_bytes);
  const totalBytes = entry.size_bytes;
  while (offset < totalBytes) {
    const slice = file.slice(offset, offset + CHUNK_SIZE_BYTES);
    try {
      const done = await putChunk(uploadId, fileName, offset, slice, token);
      offset = done.received_bytes;
    } catch (err) {
      if ((err as Error).message === "__resume__") {
        session = await fetchUpload(uploadId, false, token);
        const again = session.files.find((f) => f.name === fileName);
        offset = again ? again.received_bytes : offset;
      } else {
        throw err;
      }
    }
    onProgress?.(offset, totalBytes);
  }
}

export async function publishUpload(
  uploadId: string,
  params: PublishParams,
  token?: string
): Promise<PublishReceipt> {
  return adminFetch<PublishReceipt>(
    `/uploads/${uploadId}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, confirm: true }),
    },
    token
  );
}

export async function rollbackUpload(
  uploadId: string,
  token?: string
): Promise<PublishReceipt> {
  return adminFetch<PublishReceipt>(`/uploads/${uploadId}/rollback`, { method: "POST" }, token);
}

export async function fetchHistory(token?: string): Promise<AdminUploadSession[]> {
  const body = await adminFetch<{ uploads: AdminUploadSession[] }>("/uploads", {}, token);
  return body.uploads;
}

export interface VmStatus {
  disk_total_bytes: number;
  disk_used_bytes: number;
  disk_free_bytes: number;
  coastal_prod_bytes: number;
  abt_bytes: number;
  grids_bytes: number;
  vessel_bytes: number;
  adm_bytes: number;
  per_iso: { iso: string; monthly_bytes: number; weekly_bytes: number }[];
  raw: null | Record<string, unknown>;
  measured_at: string;
}

export async function fetchVmStatus(refresh = false, token?: string): Promise<VmStatus> {
  const suffix = refresh ? "?refresh=true" : "";
  return adminFetch<VmStatus>(`/vm-status${suffix}`, {}, token);
}

export async function setCountryEnabled(
  iso: string,
  enabled: boolean,
  token?: string
): Promise<{ iso: string; enabled: boolean }> {
  return adminFetch(
    `/countries/${iso}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    },
    token
  );
}
