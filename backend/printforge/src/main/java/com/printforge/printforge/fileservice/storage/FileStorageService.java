package com.printforge.printforge.fileservice.storage;


import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.printforge.printforge.fileservice.exception.CloudinaryUploadException;
import com.printforge.printforge.fileservice.exception.FileStorageException;
import com.printforge.printforge.fileservice.exception.InvalidFileException;
import com.printforge.printforge.fileservice.geometry.AmfGeometryParser;
import com.printforge.printforge.fileservice.geometry.GCodeWeightParser;
import com.printforge.printforge.fileservice.geometry.GCodeWeightParser.GCodeResult;
import com.printforge.printforge.fileservice.geometry.ObjGeometryParser;
import com.printforge.printforge.fileservice.geometry.PlyGeometryParser;
import com.printforge.printforge.fileservice.geometry.StlGeometryParser;
import com.printforge.printforge.fileservice.geometry.ThreeMfGeometryParser;
import com.printforge.printforge.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.util.List;
import java.util.Map;

@Service
public class FileStorageService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of(
            "stl", "obj", "3mf", "step", "stp", "gcode", "amf", "ply",
            "pdf", "txt", "png", "jpg", "jpeg"
    );

    private static final long MAX_FILE_SIZE_BYTES = 100L * 1024 * 1024; // 100MB

    // Content-type allowlist for POST /api/files/upload/image — deliberately
    // stricter and separate from ALLOWED_EXTENSIONS above, which is for the
    // general model-file upload path (STL/OBJ/etc, matched by extension).
    private static final List<String> ALLOWED_IMAGE_CONTENT_TYPES = List.of(
            "image/jpeg", "image/png", "image/webp"
    );

    private final Cloudinary cloudinary;
    private final StlGeometryParser stlGeometryParser;
    private final ObjGeometryParser objGeometryParser;
    private final ThreeMfGeometryParser threeMfGeometryParser;
    private final AmfGeometryParser amfGeometryParser;
    private final PlyGeometryParser plyGeometryParser;
    private final GCodeWeightParser gCodeWeightParser;

    public FileStorageService(Cloudinary cloudinary, StlGeometryParser stlGeometryParser,
                               ObjGeometryParser objGeometryParser, ThreeMfGeometryParser threeMfGeometryParser,
                               AmfGeometryParser amfGeometryParser, PlyGeometryParser plyGeometryParser,
                               GCodeWeightParser gCodeWeightParser) {
        this.cloudinary = cloudinary;
        this.stlGeometryParser = stlGeometryParser;
        this.objGeometryParser = objGeometryParser;
        this.threeMfGeometryParser = threeMfGeometryParser;
        this.amfGeometryParser = amfGeometryParser;
        this.plyGeometryParser = plyGeometryParser;
        this.gCodeWeightParser = gCodeWeightParser;
    }

    /** Result of an image-specific Cloudinary upload — url plus the public_id needed to manage/delete the asset later. */
    public record CloudinaryImageResult(String url, String publicId) {}

    /**
     * Uploads a profile picture / thumbnail image to Cloudinary under
     * printforge/images, separate from the general 3D-file folder used by
     * store(). Validates by Content-Type (image/jpeg, image/png, image/webp)
     * rather than by extension, since this path is images-only.
     */
    public CloudinaryImageResult storeImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("No file was attached to the request.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidFileException("File exceeds the 100MB upload limit.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new InvalidFileException(
                    "Unsupported image type '" + contentType + "'. Allowed: " + ALLOWED_IMAGE_CONTENT_TYPES);
        }

        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "resource_type", "image",
                            "folder",        "printforge/images"
                    )
            );
            return new CloudinaryImageResult(
                    (String) result.get("secure_url"),
                    (String) result.get("public_id")
            );
        } catch (Exception e) {
            throw new CloudinaryUploadException("Cloudinary image upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Best-effort cleanup of a previously-uploaded image (e.g. the old
     * profile picture before a new one replaces it). Swallows failures —
     * a delete failure shouldn't block the new upload that triggered it.
     */
    public void deleteImage(String publicId) {
        if (publicId == null || publicId.isBlank()) return;
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception e) {
            // best-effort — orphaned asset is an acceptable outcome, a
            // failed profile picture update is not.
        }
    }

    /**
     * Deletes the Cloudinary asset backing a removed ModelFile
     * (DELETE /api/files/{id}, see FileService.deleteFile()). Unlike
     * deleteImage() above, this needs an explicit resource_type: general
     * uploads (STL/OBJ/etc, via store()) land in Cloudinary as "raw", and
     * destroy() defaults to "image" when resource_type is omitted — against
     * a raw asset that silently returns "not found" and deletes nothing.
     * Best-effort for the same reason as deleteImage(): the ModelFile row
     * is already gone by the time this runs, so a Cloudinary-side failure
     * shouldn't surface as a failed delete to the caller.
     */
    public void deleteAsset(String publicId, String resourceType) {
        if (publicId == null || publicId.isBlank()) return;
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                    "resource_type", resourceType != null ? resourceType : "image"));
        } catch (Exception e) {
            // best-effort — see deleteImage() above.
        }
    }

    /**
     * Result of store() — the Cloudinary URL, plus parsed geometry
     * (stl/obj/3mf/amf/ply) or pre-sliced weight/duration (gcode), if
     * applicable. geometryResult is GeometryResult.failed() and
     * gcodeResult is GCodeResult.failed() for every extension/case that
     * doesn't apply — callers only need to check the one relevant to the
     * extension they uploaded. publicId/resourceType are Cloudinary's own
     * identifiers for the uploaded asset — needed later by
     * deleteAsset()/DELETE /api/files/{id}; previously discarded here, so
     * general (non-image) uploads had no way to ever be removed from
     * Cloudinary again.
     */
    public record StoreResult(String url, String publicId, String resourceType,
                               GeometryResult geometryResult, GCodeResult gcodeResult) {}

    /**
     * Uploads the file to Cloudinary and returns the secure public URL
     * (plus parsed geometry, for STL/OBJ uploads). The URL is what gets
     * stored in model_files.file_url and design_listings.thumbnail_url —
     * it loads directly in the mobile app without any backend download
     * endpoint.
     */
    public StoreResult store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("No file was attached to the request.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidFileException("File exceeds the 100MB upload limit.");
        }

        String extension = extractExtension(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : ""
        );

        if (extension.isEmpty() || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new InvalidFileException(
                    "Unsupported file type '" + extension + "'. Allowed: " + ALLOWED_EXTENSIONS);
        }

        try {
            byte[] bytes = file.getBytes();

            // Geometry/weight parsing happens against the same bytes
            // already read for the upload below — no second read of the
            // file. A failed parse never blocks the upload: none of these
            // parsers ever throw, all always return a ...failed() result
            // on any problem.
            GeometryResult geometryResult = GeometryResult.failed();
            GCodeResult gcodeResult = GCodeResult.failed();
            switch (extension.toLowerCase()) {
                case "stl" -> geometryResult = stlGeometryParser.parse(bytes, file.getOriginalFilename());
                case "obj" -> geometryResult = objGeometryParser.parse(bytes, file.getOriginalFilename());
                case "3mf" -> geometryResult = threeMfGeometryParser.parse(bytes, file.getOriginalFilename());
                case "amf" -> geometryResult = amfGeometryParser.parse(bytes, file.getOriginalFilename());
                case "ply" -> geometryResult = plyGeometryParser.parse(bytes, file.getOriginalFilename());
                case "gcode" -> {
                    // materialType is null — it isn't known yet at upload
                    // time (chosen later, at estimate time); the parser
                    // defaults to PLA density for the length-based
                    // conversion in that case. See GCodeWeightParser's
                    // javadoc for the full tradeoff.
                    gcodeResult = gCodeWeightParser.parse(bytes, file.getOriginalFilename(), null);
                }
                default -> { /* step/stp and every other accepted extension stay on the file-size fallback */ }
            }

            // resource_type "auto" handles both images and raw files (STL, OBJ etc.)
            Map<?, ?> result = cloudinary.uploader().upload(
                    bytes,
                    ObjectUtils.asMap(
                            "resource_type", "auto",
                            "folder",        "printforge"
                    )
            );
            return new StoreResult((String) result.get("secure_url"), (String) result.get("public_id"),
                    (String) result.get("resource_type"), geometryResult, gcodeResult);

      } catch (Exception e) {
    System.out.println("=== CLOUDINARY ERROR ===");
    System.out.println("Message: " + e.getMessage());
    System.out.println("Cause: " + e.getCause());
    e.printStackTrace();
    throw new CloudinaryUploadException("Cloudinary upload failed: " + e.getMessage(), e);
}
    }

    /**
     * For Cloudinary storage the URL is already public — just wrap it as a
     * Resource so the existing FileController download endpoint still compiles.
     * In practice the frontend should use the URL directly rather than going
     * through this endpoint for images/thumbnails.
     */
    public Resource load(String fileUrl) {
        try {
            return new UrlResource(fileUrl);
        } catch (MalformedURLException e) {
            throw new FileStorageException("Invalid Cloudinary URL: " + fileUrl, e);
        }
        
    }

    private String extractExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return (dot == -1 || dot == filename.length() - 1) ? "" : filename.substring(dot + 1);
    }
}
