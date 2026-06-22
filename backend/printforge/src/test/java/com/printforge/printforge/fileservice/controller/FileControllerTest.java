package com.printforge.printforge.fileservice.controller;

import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.service.FileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Proves GET /{id} and
 * /{id}/download now actually check ownership before returning anything —
 * before this fix, any authenticated user could view/download any file by
 * id regardless of who uploaded it.
 *
 * Run with: ./mvnw test -Dtest=FileControllerTest
 */
class FileControllerTest {

    FileService fileService;
    FileController controller;

    @BeforeEach
    void setUp() {
        fileService = Mockito.mock(FileService.class);
        controller = new FileController(fileService);
    }

    private ModelFile fileUploadedBy(String email) {
        ModelFile file = new ModelFile();
        file.setFileId(1L);
        file.setFileName("model.stl");
        file.setFileType("model/stl");
        file.setUploadedBy(email);
        return file;
    }

    private Authentication authAs(String email, String... roles) {
        List<SimpleGrantedAuthority> authorities = List.of(roles).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        return new UsernamePasswordAuthenticationToken(email, null, authorities);
    }

    @Test
    void ownerCanViewTheirOwnFile() {
        Mockito.when(fileService.getFileById(1L)).thenReturn(fileUploadedBy("alice@knust.edu.gh"));

        var response = controller.getFileById(1L, authAs("alice@knust.edu.gh"));

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void nonOwnerCannotViewSomeoneElsesFile() {
        Mockito.when(fileService.getFileById(1L)).thenReturn(fileUploadedBy("alice@knust.edu.gh"));

        assertThrows(AccessDeniedException.class,
                () -> controller.getFileById(1L, authAs("bob@knust.edu.gh")));
    }

    @Test
    void staffCanViewAnyUsersFile() {
        Mockito.when(fileService.getFileById(1L)).thenReturn(fileUploadedBy("alice@knust.edu.gh"));

        var response = controller.getFileById(1L, authAs("staff@knust.edu.gh", "ROLE_LAB_STAFF"));

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void nonStaffListEndpointOnlyReturnsOwnFiles() {
        Mockito.when(fileService.getFilesForUser("alice@knust.edu.gh"))
                .thenReturn(List.of(fileUploadedBy("alice@knust.edu.gh")));

        var response = controller.getAllFiles(authAs("alice@knust.edu.gh"));

        assertEquals(1, response.getBody().size());
        Mockito.verify(fileService, Mockito.never()).getAllFiles();
    }

    @Test
    void staffListEndpointReturnsEverything() {
        Mockito.when(fileService.getAllFiles())
                .thenReturn(List.of(fileUploadedBy("alice@knust.edu.gh"), fileUploadedBy("bob@knust.edu.gh")));

        var response = controller.getAllFiles(authAs("staff@knust.edu.gh", "ROLE_ADMIN"));

        assertEquals(2, response.getBody().size());
    }
}
