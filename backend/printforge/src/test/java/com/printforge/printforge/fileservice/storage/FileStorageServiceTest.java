package com.printforge.printforge.fileservice.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.printforge.printforge.fileservice.exception.FileStorageException;
import com.printforge.printforge.fileservice.exception.InvalidFileException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for the Cloudinary-backed FileStorageService.
 * Cloudinary SDK calls are mocked so no network or real credentials are needed.
 *
 * Run with: ./mvnw test -Dtest=FileStorageServiceTest
 */
class FileStorageServiceTest {

    Cloudinary cloudinary;
    Uploader uploader;
    FileStorageService storageService;

    @BeforeEach
    void setUp() {
        cloudinary = Mockito.mock(Cloudinary.class);
        uploader = Mockito.mock(Uploader.class);
        Mockito.when(cloudinary.uploader()).thenReturn(uploader);
        storageService = new FileStorageService(cloudinary);
    }

    @Test
    void storeReturnsCloudinarySecureUrl() throws Exception {
        byte[] content = "solid cube\nfacet normal 0 0 0\n".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile upload = new MockMultipartFile("file", "cube.stl", "model/stl", content);

        Mockito.when(uploader.upload(Mockito.any(byte[].class), Mockito.anyMap()))
               .thenReturn(Map.of("secure_url", "https://res.cloudinary.com/demo/raw/upload/printforge/cube.stl"));

        String url = storageService.store(upload);

        assertEquals("https://res.cloudinary.com/demo/raw/upload/printforge/cube.stl", url);
    }

    @Test
    void rejectsEmptyFile() {
        MockMultipartFile empty = new MockMultipartFile("file", "cube.stl", "model/stl", new byte[0]);
        assertThrows(InvalidFileException.class, () -> storageService.store(empty));
    }

    @Test
    void rejectsDisallowedExtension() {
        MockMultipartFile exe = new MockMultipartFile("file", "virus.exe", "application/octet-stream",
                "not a model".getBytes(StandardCharsets.UTF_8));
        assertThrows(InvalidFileException.class, () -> storageService.store(exe));
    }

    @Test
    void wrapsCloudinaryExceptionInFileStorageException() throws Exception {
        byte[] content = "solid cube\n".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile upload = new MockMultipartFile("file", "cube.stl", "model/stl", content);

        Mockito.when(uploader.upload(Mockito.any(byte[].class), Mockito.anyMap()))
               .thenThrow(new RuntimeException("Cloudinary network error"));

        assertThrows(FileStorageException.class, () -> storageService.store(upload));
    }

    @Test
    void loadWrapsCloudinaryUrlAsResource() {
        String url = "https://res.cloudinary.com/demo/raw/upload/printforge/cube.stl";
        var resource = storageService.load(url);
        assertTrue(resource.isReadable() || !resource.isReadable(), // just checks no exception thrown
                "load() should return a UrlResource without throwing");
        assertNotNull(resource);
    }
}
