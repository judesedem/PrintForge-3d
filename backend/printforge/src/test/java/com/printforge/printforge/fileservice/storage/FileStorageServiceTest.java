package com.printforge.printforge.fileservice.storage;

import com.printforge.printforge.fileservice.exception.InvalidFileException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

/**
 * No Spring context / no database needed — this just proves the file
 * service actually writes and reads real bytes on disk, which is the
 * behavior that was missing before this fix (the old version never
 * touched file content at all).
 *
 * Run with: ./mvnw test -Dtest=FileStorageServiceTest
 */
class FileStorageServiceTest {

    @TempDir
    Path tempDir;

    FileStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new FileStorageService(tempDir.toString());
    }

    @Test
    void storesFileAndReturnsRetrievableContent() throws IOException {
        byte[] content = "solid cube\nfacet normal 0 0 0\n".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile upload = new MockMultipartFile("file", "cube.stl", "model/stl", content);

        String storedFilename = storageService.store(upload);
        assertNotNull(storedFilename);
        assertTrue(storedFilename.endsWith("_cube.stl"));

        Resource loaded = storageService.load(storedFilename);
        assertTrue(loaded.exists());
        byte[] readBack;
        try (var in = loaded.getInputStream()) {
            readBack = in.readAllBytes();
        }
        assertArrayEquals(content, readBack, "Bytes read back from disk should match what was uploaded");
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
    void twoUploadsWithSameOriginalNameDoNotCollide() throws IOException {
        byte[] contentA = "version A".getBytes(StandardCharsets.UTF_8);
        byte[] contentB = "version B".getBytes(StandardCharsets.UTF_8);

        String storedA = storageService.store(new MockMultipartFile("file", "model.stl", "model/stl", contentA));
        String storedB = storageService.store(new MockMultipartFile("file", "model.stl", "model/stl", contentB));

        assertNotEquals(storedA, storedB, "Two different uploads with the same original filename must not overwrite each other");

        byte[] readA;
        try (var in = storageService.load(storedA).getInputStream()) {
            readA = in.readAllBytes();
        }
        byte[] readB;
        try (var in = storageService.load(storedB).getInputStream()) {
            readB = in.readAllBytes();
        }
        assertArrayEquals(contentA, readA);
        assertArrayEquals(contentB, readB);
    }
}
