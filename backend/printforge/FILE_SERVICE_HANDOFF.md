# PrintForge 3D — File Service Fix Handoff (Group 42 / KNUST CODEQUEST 2026)

Scope of this pass: **File Service only**, per `POST /api/files/upload | GET /api/files/{id}` in
`docs/API_CONTRACT.MD`. Auth Service was confirmed working and was not touched. No other service
(Print Job, Estimate, Queue, Notification, Admin) exists yet — those are still outstanding.

## The bug

`FileController.uploadFile` took `fileName`, `fileUrl`, `fileType` as plain `@RequestParam` strings
and just wrote them into a `model_files` row. **No file content was ever sent, received, or stored.**
The client supplied a URL string, and the server trusted it — it never touched any bytes. There was
also no way to download a file back out, since the "url" was never backed by anything.

## What changed

| # | Item | Files |
|---|------|-------|
| 1 | New `FileStorageService` — actually writes uploaded bytes to disk (`app.upload.dir`, default `./uploads`) and reads them back. Validates file isn't empty, is under 100MB, and has an allowed extension (`stl, obj, 3mf, step, stp, gcode, amf, ply, pdf, txt, png, jpg, jpeg`). Generates a collision-proof on-disk filename (`UUID_originalname`). | `fileservice/storage/FileStorageService.java` (new) |
| 2 | `FileController.uploadFile` now takes a real `MultipartFile` (`@RequestParam("file")`) instead of three strings. | `fileservice/controller/FileController.java` |
| 3 | New `GET /api/files/{id}/download` — streams the actual file bytes back with the right `Content-Type` and `Content-Disposition`. This didn't exist before; metadata alone was useless without a way to retrieve what was uploaded. | `fileservice/controller/FileController.java` |
| 4 | `ModelFile` entity — added `storedFilename` (internal disk name, never exposed to clients) and `fileSizeBytes`. `fileUrl` is now a real, working URL (`/api/files/{id}/download`), computed server-side after the row gets its id — not something the client can spoof. | `fileservice/model/ModelFile.java` |
| 5 | `FileService` — orchestrates: store bytes → save metadata → fill in `fileUrl` → save again. Added `loadFileContent(id)` for the download endpoint. | `fileservice/service/FileService.java` |
| 6 | Three new exceptions (`InvalidFileException` 400, `ModelFileNotFoundException` 404, `FileStorageException` 500) wired into the existing `GlobalExceptionHandler`, matching the pattern already used for auth exceptions. | `fileservice/exception/*.java` (new), `exception/GlobalExceptionHandler.java` |
| 7 | `application.properties` — added `app.upload.dir`, `spring.servlet.multipart.max-file-size=100MB`, `spring.servlet.multipart.max-request-size=100MB`. Without the multipart limits Spring rejects anything beyond its 1MB default. | `application.properties` |
| 8 | `.gitignore` — added `uploads/` so test uploads don't get committed. | `backend/printforge/.gitignore` |
| 9 | New unit test, no DB/Spring context required — proves real bytes round-trip through disk, rejects empty files and disallowed extensions, and that two uploads with the same original filename don't collide. | `fileservice/storage/FileStorageServiceTest.java` (new) |

### API contract (unchanged endpoints, one addition)

```
POST /api/files/upload        multipart/form-data, field name "file", auth required
GET  /api/files/{id}          metadata: fileId, fileName, fileUrl, fileType, fileSizeBytes, uploadedAt, uploadedBy
GET  /api/files/{id}/download new — streams the actual file
GET  /api/files               list all (debugging convenience, not in the contract doc)
```

---

## ⚠️ I could not actually run or test this

This sandbox has no network access to Maven Central (`repo.maven.apache.org` isn't in the allowed
egress list) and no cached `~/.m2` repository, so `./mvnw` can't even download Maven itself, let
alone resolve Spring Boot/JPA/etc. There's also no Postgres instance reachable here. So everything
above is a careful manual read-through (signatures, types, imports, save/flush ordering for the
two-step `fileUrl` write), **not a verified compile or run**. Please run these before trusting it:

```bash
cd backend/printforge

# 1. Compile
./mvnw compile

# 2. Run the new unit test (no DB needed for this one)
./mvnw test -Dtest=FileStorageServiceTest

# 3. Start the app for real (needs Postgres running locally per application.properties)
./mvnw spring-boot:run
```

Then with the app up, get a token and try a real upload + download:

```bash
# Register/login to get a token (Auth Service, already working)
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@knust.edu.gh","password":"yourpassword"}' | jq -r .token)

# Upload an actual file
curl -X POST localhost:8080/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/some-model.stl"
# → should return JSON with a fileId and a fileUrl like /api/files/1/download

# Confirm the bytes actually come back
curl -OJ -H "Authorization: Bearer $TOKEN" localhost:8080/api/files/1/download
# → should save a file identical to the one you uploaded; diff them to be sure
```

If `./mvnw compile` fails, the most likely culprits given what I changed: a Lombok getter/setter
name mismatch on the new `ModelFile` fields, or the `MediaType.parseMediaType(...)` call in
`downloadFile` choking on a stored `fileType` value that isn't a valid MIME type. Both are easy
fixes if they show up — flag them and I'll patch immediately.

## Known gaps / flagged for later, deliberately not touched this pass

- **No ownership/role check on download.** Right now any authenticated user can download any
  file by id (`anyRequest().authenticated()` in `SecurityConfig` is unchanged). The proposal's
  non-functional requirements call for role-based file access control. Left out because it's a
  cross-cutting concern that really belongs with the Print Job Service (a file's owner is really
  "whoever owns the print job it's attached to"), not something to bolt onto File Service in
  isolation.
- **Frontend doesn't call `/api/files/upload` at all yet.** `Frontend/src/services/api.ts` only has
  `apiSubmitJob()`, which bundles the file directly into a (not-yet-built) `POST /api/print-jobs`
  multipart request. There's no standalone `apiUploadFile()` / file type in the frontend. Worth
  deciding when Print Job Service gets built: does it call File Service internally to store the
  attachment, or does the frontend upload to File Service first and pass back a `file_id`? The
  contract doc implies the latter (`PrintJob` has a `file_id` field), but the frontend isn't wired
  for it yet.
- **No file deletion endpoint.** Not in the original API contract, but worth a thought before
  storage fills up with orphaned uploads from rejected jobs.

## Next service

Whoever picks this up next: Print Job Service (`POST/GET /api/print-jobs`, `GET/PUT /api/print-jobs/{id}`)
is the natural next step, since it's what File Service's output (`file_id`) actually plugs into.
