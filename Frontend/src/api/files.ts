import { ApiError, apiFetch } from './client';

// Mirrors fileservice/model/ModelFile.java's JSON output exactly. Same
// situation as notifications.ts/marketplace.ts: no DTO layer —
// FileController returns the JPA entity directly, so field names are
// Jackson's default camelCase getters.
export type ModelFileApiResponse = {
  fileId: number;
  fileName: string;
  fileUrl: string | null;
  fileType: string;
  storedFilename: string;
  fileSizeBytes: number;
  uploadedAt: string | null;
  userId: number | null;
};

export type ModelFile = {
  id: string;
  fileName: string;
  fileUrl: string | null;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string | null;
};

export function toModelFile(res: ModelFileApiResponse): ModelFile {
  return {
    id: String(res.fileId),
    fileName: res.fileName,
    fileUrl: res.fileUrl,
    fileType: res.fileType,
    fileSizeBytes: res.fileSizeBytes,
    uploadedAt: res.uploadedAt,
  };
}

// XHR wrapper for multipart FormData uploads. React Native's native fetch
// (in Expo Go SDK 56) doesn't support the { uri, name, type } FormData
// pattern reliably — XHR handles file uploads better. Returns a Response
// object for compatibility with the rest of the error-handling path.
function uploadFileXHR(url: string, token: string, form: FormData): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
      resolve(new Response(xhr.responseText, { status: xhr.status }));
    };

    xhr.onerror = () => {
      reject(new Error('XHR network error'));
    };

    xhr.send(form);
  });
}

/**
 * Maps to POST /api/files/upload. The backend binds this via
 * @RequestParam("file") MultipartFile, so this sends real multipart/
 * form-data, not a JSON body — same pattern as marketplace.ts's
 * createListing (thumbnail part).
 *
 * `asset` matches what expo-document-picker's DocumentPickerAsset gives
 * you: a local `uri`, `name`, and `mimeType`.
 *
 * Uses XMLHttpRequest instead of fetch() because React Native's native
 * fetch (Expo Go SDK 56) doesn't support the { uri, name, type } FormData
 * pattern — it throws "Unsupported FormDataPart implementation". XHR
 * handles file uploads more reliably in this context.
 */
export async function uploadFile(
  token: string,
  asset: { uri: string; name: string; mimeType?: string | null }
): Promise<ModelFile> {
  // React Native multipart part: a plain { uri, name, type } object.
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.name || 'upload.stl',
    type: asset.mimeType ?? 'application/octet-stream',
  } as any);

  const url = `${process.env.EXPO_PUBLIC_API_URL}/api/files/upload`;

  let response: Response;
  try {
    // XHR instead of fetch — more reliable for RN file uploads.
    response = await uploadFileXHR(url, token, form);
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and API URL.');
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    const message =
      (data as { message?: string } | undefined)?.message ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return toModelFile(data as ModelFileApiResponse);
}

/** Maps to GET /api/files/{id}. Caller must be the uploader or staff (403 otherwise). */
export async function fetchFile(token: string, id: string): Promise<ModelFile> {
  const data = await apiFetch<ModelFileApiResponse>(`/api/files/${id}`, { token });
  return toModelFile(data);
}

/** Maps to GET /api/files — staff see every file, everyone else sees only their own uploads. */
export async function fetchFiles(token: string): Promise<ModelFile[]> {
  const data = await apiFetch<ModelFileApiResponse[]>('/api/files', { token });
  return data.map(toModelFile);
}

/**
 * GET /api/files/{id}/download streams raw bytes (Resource), not JSON —
 * apiFetch always parses the response body as JSON, so it can't be used
 * here. This just builds the URL; callers fetch/open it directly (e.g.
 * Linking.openURL, or a manual authenticated fetch) rather than routing
 * through apiFetch. Not called from anywhere yet — no screen in this
 * batch needs to actually download a file back.
 */
export function getDownloadUrl(id: string): string {
  return `${process.env.EXPO_PUBLIC_API_URL}/api/files/${id}/download`;
}
