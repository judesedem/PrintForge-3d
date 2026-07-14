import { apiFetch } from './client';

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

/**
 * Maps to POST /api/files/upload. The backend binds this via
 * @RequestParam("file") MultipartFile, so this sends real multipart/
 * form-data (apiFetch's isFormData option), not a JSON body — same
 * pattern as marketplace.ts's createListing (thumbnail part).
 *
 * `asset` matches what expo-document-picker's DocumentPickerAsset gives
 * you: a local `uri`, `name`, and `mimeType`.
 */
export async function uploadFile(
  token: string,
  asset: { uri: string; name: string; mimeType?: string | null }
): Promise<ModelFile> {
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);

  const data = await apiFetch<ModelFileApiResponse>('/api/files/upload', {
    method: 'POST',
    token,
    body: form,
    isFormData: true,
  });
  return toModelFile(data);
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
