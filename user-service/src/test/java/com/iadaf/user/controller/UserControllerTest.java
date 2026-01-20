package com.iadaf.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iadaf.user.dto.CreateUserRequest;
import com.iadaf.user.dto.UserDTO;
import com.iadaf.user.exception.ResourceNotFoundException;
import com.iadaf.user.exception.UserAlreadyExistsException;
import com.iadaf.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    private UserDTO userDTO;
    private CreateUserRequest createUserRequest;

    @BeforeEach
    void setUp() {
        userDTO = new UserDTO();
        userDTO.setId(1L);
        userDTO.setNom("Dupont");
        userDTO.setPrenom("Jean");
        userDTO.setEmail("jean.dupont@example.com");
        userDTO.setTelephone("0123456789");
        userDTO.setLanguePreferee("FR");
        userDTO.setPaysOrigine("France");
        userDTO.setActif(true);
        userDTO.setDateCreation(LocalDateTime.now());
        userDTO.setDateModification(LocalDateTime.now());

        createUserRequest = new CreateUserRequest();
        createUserRequest.setNom("Dupont");
        createUserRequest.setPrenom("Jean");
        createUserRequest.setEmail("jean.dupont@example.com");
        createUserRequest.setTelephone("0123456789");
        createUserRequest.setLanguePreferee("FR");
        createUserRequest.setPaysOrigine("France");
    }

    @Test
    void testCreateUser_Success() throws Exception {
        // Arrange
        when(userService.createUser(any(CreateUserRequest.class))).thenReturn(userDTO);

        // Act & Assert
        mockMvc.perform(post("/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createUserRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.nom").value("Dupont"))
                .andExpect(jsonPath("$.email").value("jean.dupont@example.com"));

        verify(userService, times(1)).createUser(any(CreateUserRequest.class));
    }

    @Test
    void testCreateUser_ValidationError() throws Exception {
        // Arrange
        CreateUserRequest invalidRequest = new CreateUserRequest();
        invalidRequest.setNom("");
        invalidRequest.setPrenom("");
        invalidRequest.setEmail("invalid-email");

        // Act & Assert
        mockMvc.perform(post("/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verify(userService, never()).createUser(any(CreateUserRequest.class));
    }

    @Test
    void testCreateUser_EmailAlreadyExists() throws Exception {
        // Arrange
        when(userService.createUser(any(CreateUserRequest.class)))
                .thenThrow(new UserAlreadyExistsException("jean.dupont@example.com"));

        // Act & Assert
        mockMvc.perform(post("/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createUserRequest)))
                .andExpect(status().isConflict());

        verify(userService, times(1)).createUser(any(CreateUserRequest.class));
    }

    @Test
    void testGetAllUsers() throws Exception {
        // Arrange
        List<UserDTO> users = Arrays.asList(userDTO);
        when(userService.getAllUsers()).thenReturn(users);

        // Act & Assert
        mockMvc.perform(get("/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].email").value("jean.dupont@example.com"));

        verify(userService, times(1)).getAllUsers();
    }

    @Test
    void testGetUserById_Success() throws Exception {
        // Arrange
        when(userService.getUserById(1L)).thenReturn(userDTO);

        // Act & Assert
        mockMvc.perform(get("/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("jean.dupont@example.com"));

        verify(userService, times(1)).getUserById(1L);
    }

    @Test
    void testGetUserById_NotFound() throws Exception {
        // Arrange
        when(userService.getUserById(1L))
                .thenThrow(new ResourceNotFoundException("Utilisateur", "id", 1L));

        // Act & Assert
        mockMvc.perform(get("/users/1"))
                .andExpect(status().isNotFound());

        verify(userService, times(1)).getUserById(1L);
    }

    @Test
    void testGetUserByEmail_Success() throws Exception {
        // Arrange
        when(userService.getUserByEmail("jean.dupont@example.com")).thenReturn(userDTO);

        // Act & Assert
        mockMvc.perform(get("/users/email/jean.dupont@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("jean.dupont@example.com"));

        verify(userService, times(1)).getUserByEmail("jean.dupont@example.com");
    }

    @Test
    void testUpdateUser_Success() throws Exception {
        // Arrange
        when(userService.updateUser(eq(1L), any(CreateUserRequest.class))).thenReturn(userDTO);

        // Act & Assert
        mockMvc.perform(put("/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createUserRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("jean.dupont@example.com"));

        verify(userService, times(1)).updateUser(eq(1L), any(CreateUserRequest.class));
    }

    @Test
    void testDeleteUser_Success() throws Exception {
        // Arrange
        doNothing().when(userService).deleteUser(1L);

        // Act & Assert
        mockMvc.perform(delete("/users/1"))
                .andExpect(status().isNoContent());

        verify(userService, times(1)).deleteUser(1L);
    }

    @Test
    void testGetUsersByLangue() throws Exception {
        // Arrange
        List<UserDTO> users = Arrays.asList(userDTO);
        when(userService.getUsersByLangue("FR")).thenReturn(users);

        // Act & Assert
        mockMvc.perform(get("/users/langue/FR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].languePreferee").value("FR"));

        verify(userService, times(1)).getUsersByLangue("FR");
    }

    @Test
    void testGetUsersByPays() throws Exception {
        // Arrange
        List<UserDTO> users = Arrays.asList(userDTO);
        when(userService.getUsersByPays("France")).thenReturn(users);

        // Act & Assert
        mockMvc.perform(get("/users/pays/France"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].paysOrigine").value("France"));

        verify(userService, times(1)).getUsersByPays("France");
    }
}
