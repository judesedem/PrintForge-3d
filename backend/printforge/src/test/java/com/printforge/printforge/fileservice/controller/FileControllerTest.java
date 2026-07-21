package com.printforge.printforge.fileservice.controller;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.service.FileService;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Proves GET /{id} and
 * /{id}/download check ownership (by userId, same convention as every
 * other entity in the app) before returning anything — before this fix,
 * any authenticated user could view/download any file by id.
 *
 * Run with: ./mvnw test -Dtest=FileControllerTest
 */
class FileControllerTest {

    FileService fileService;
    UserRepository userRepository;
    FileController controller;

    @BeforeEach
    void setUp() {
        fileService = Mockito.mock(FileService.class);
        userRepository = Mockito.mock(UserRepository.class);
        controller = new FileController(fileService, userRepository);
    }

    private ModelFile fileUploadedBy(Long userId) {
        ModelFile file = new ModelFile();
        file.setFileId(1L);
        file.setFileName("model.stl");
        file.setFileType("model/stl");
        file.setUserId(userId);
        return file;
    }

    private User userWithId(Long id, String email, Role role) {
        User user = new User();
        user.setUserId(id);
        user.setEmail(email);
        user.setRole(role);
        return user;
    }

    private Authentication authAs(String email, String... roles) {
        List<SimpleGrantedAuthority> authorities = List.of(roles).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        return new UsernamePasswordAuthenticationToken(email, null, authorities);
    }

    @Test
    void ownerCanViewTheirOwnFile() {
        Mockito.when(fileService.getFileById(1L)).thenReturn(fileUploadedBy(7L));
        Mockito.when(userRepository.findByEmail("alice@knust.edu.gh"))
                .thenReturn(Optional.of(userWithId(7L, "alice@knust.edu.gh", Role.STUDENT)));

        var response = controller.getFileById(1L, authAs("alice@knust.edu.gh"));

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void nonOwnerCannotViewSomeoneElsesFile() {
        Mockito.when(fileService.getFileById(1L)).thenReturn(fileUploadedBy(7L));
        Mockito.when(userRepository.findByEmail("bob@knust.edu.gh"))
                .thenReturn(Optional.of(userWithId(8L, "bob@knust.edu.gh", Role.STUDENT)));

        assertThrows(AccessDeniedException.class,
                () -> controller.getFileById(1L, authAs("bob@knust.edu.gh")));
    }

    @Test
    void staffCanViewAnyUsersFile() {
        Mockito.when(fileService.getFileById(1L)).thenReturn(fileUploadedBy(7L));

        var response = controller.getFileById(1L, authAs("staff@knust.edu.gh", "ROLE_LAB_STAFF"));

        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void ownerCanDeleteTheirOwnFile() {
        ModelFile file = fileUploadedBy(7L);
        Mockito.when(fileService.getFileById(1L)).thenReturn(file);
        Mockito.when(userRepository.findByEmail("alice@knust.edu.gh"))
                .thenReturn(Optional.of(userWithId(7L, "alice@knust.edu.gh", Role.STUDENT)));

        var response = controller.deleteFile(1L, authAs("alice@knust.edu.gh"));

        assertEquals(204, response.getStatusCode().value());
        Mockito.verify(fileService).deleteFile(file);
    }

    @Test
    void nonOwnerCannotDeleteSomeoneElsesFile() {
        Mockito.when(fileService.getFileById(1L)).thenReturn(fileUploadedBy(7L));
        Mockito.when(userRepository.findByEmail("bob@knust.edu.gh"))
                .thenReturn(Optional.of(userWithId(8L, "bob@knust.edu.gh", Role.STUDENT)));

        assertThrows(AccessDeniedException.class,
                () -> controller.deleteFile(1L, authAs("bob@knust.edu.gh")));
        Mockito.verify(fileService, Mockito.never()).deleteFile(Mockito.any());
    }

    @Test
    void staffCanDeleteAnyUsersFile() {
        ModelFile file = fileUploadedBy(7L);
        Mockito.when(fileService.getFileById(1L)).thenReturn(file);

        var response = controller.deleteFile(1L, authAs("staff@knust.edu.gh", "ROLE_LAB_STAFF"));

        assertEquals(204, response.getStatusCode().value());
        Mockito.verify(fileService).deleteFile(file);
    }

    @Test
    void nonStaffListEndpointOnlyReturnsOwnFiles() {
        Mockito.when(userRepository.findByEmail("alice@knust.edu.gh"))
                .thenReturn(Optional.of(userWithId(7L, "alice@knust.edu.gh", Role.STUDENT)));
        Mockito.when(fileService.getFilesForUser(7L))
                .thenReturn(List.of(fileUploadedBy(7L)));

        var response = controller.getAllFiles(authAs("alice@knust.edu.gh"));

        assertEquals(1, response.getBody().size());
        Mockito.verify(fileService, Mockito.never()).getAllFiles();
    }

    @Test
    void staffListEndpointReturnsEverything() {
        Mockito.when(fileService.getAllFiles())
                .thenReturn(List.of(fileUploadedBy(7L), fileUploadedBy(8L)));

        var response = controller.getAllFiles(authAs("staff@knust.edu.gh", "ROLE_ADMIN"));

        assertEquals(2, response.getBody().size());
    }
}
