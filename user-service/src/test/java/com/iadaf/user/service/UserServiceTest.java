package com.iadaf.user.service;

import com.iadaf.user.dto.CreateUserRequest;
import com.iadaf.user.dto.UserDTO;
import com.iadaf.user.entity.User;
import com.iadaf.user.exception.ResourceNotFoundException;
import com.iadaf.user.exception.UserAlreadyExistsException;
import com.iadaf.user.mapper.UserMapper;
import com.iadaf.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserService userService;

    private User user;
    private UserDTO userDTO;
    private CreateUserRequest createUserRequest;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setNom("Dupont");
        user.setPrenom("Jean");
        user.setEmail("jean.dupont@example.com");
        user.setTelephone("0123456789");
        user.setLanguePreferee("FR");
        user.setPaysOrigine("France");
        user.setActif(true);

        userDTO = new UserDTO();
        userDTO.setId(1L);
        userDTO.setNom("Dupont");
        userDTO.setPrenom("Jean");
        userDTO.setEmail("jean.dupont@example.com");
        userDTO.setTelephone("0123456789");
        userDTO.setLanguePreferee("FR");
        userDTO.setPaysOrigine("France");
        userDTO.setActif(true);

        createUserRequest = new CreateUserRequest();
        createUserRequest.setNom("Dupont");
        createUserRequest.setPrenom("Jean");
        createUserRequest.setEmail("jean.dupont@example.com");
        createUserRequest.setTelephone("0123456789");
        createUserRequest.setLanguePreferee("FR");
        createUserRequest.setPaysOrigine("France");
    }

    @Test
    void testCreateUser_Success() {
        // Arrange
        when(userRepository.existsByEmail(createUserRequest.getEmail())).thenReturn(false);
        when(userMapper.toEntity(createUserRequest)).thenReturn(user);
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(userMapper.toDTO(user)).thenReturn(userDTO);

        // Act
        UserDTO result = userService.createUser(createUserRequest);

        // Assert
        assertNotNull(result);
        assertEquals(userDTO.getEmail(), result.getEmail());
        verify(userRepository, times(1)).existsByEmail(createUserRequest.getEmail());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testCreateUser_EmailAlreadyExists() {
        // Arrange
        when(userRepository.existsByEmail(createUserRequest.getEmail())).thenReturn(true);

        // Act & Assert
        assertThrows(UserAlreadyExistsException.class, () -> {
            userService.createUser(createUserRequest);
        });
        verify(userRepository, times(1)).existsByEmail(createUserRequest.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testGetAllUsers() {
        // Arrange
        List<User> users = Arrays.asList(user);
        when(userRepository.findAll()).thenReturn(users);
        when(userMapper.toDTO(user)).thenReturn(userDTO);

        // Act
        List<UserDTO> result = userService.getAllUsers();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(userRepository, times(1)).findAll();
    }

    @Test
    void testGetUserById_Success() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userMapper.toDTO(user)).thenReturn(userDTO);

        // Act
        UserDTO result = userService.getUserById(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void testGetUserById_NotFound() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            userService.getUserById(1L);
        });
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void testGetUserByEmail_Success() {
        // Arrange
        when(userRepository.findByEmail("jean.dupont@example.com")).thenReturn(Optional.of(user));
        when(userMapper.toDTO(user)).thenReturn(userDTO);

        // Act
        UserDTO result = userService.getUserByEmail("jean.dupont@example.com");

        // Assert
        assertNotNull(result);
        assertEquals("jean.dupont@example.com", result.getEmail());
        verify(userRepository, times(1)).findByEmail("jean.dupont@example.com");
    }

    @Test
    void testUpdateUser_Success() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(userMapper.toDTO(user)).thenReturn(userDTO);

        // Act
        UserDTO result = userService.updateUser(1L, createUserRequest);

        // Assert
        assertNotNull(result);
        verify(userRepository, times(1)).findById(1L);
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testUpdateUser_NotFound() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            userService.updateUser(1L, createUserRequest);
        });
        verify(userRepository, times(1)).findById(1L);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testDeleteUser_Success() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        doNothing().when(userRepository).delete(user);

        // Act
        userService.deleteUser(1L);

        // Assert
        verify(userRepository, times(1)).findById(1L);
        verify(userRepository, times(1)).delete(user);
    }

    @Test
    void testGetUsersByLangue() {
        // Arrange
        List<User> users = Arrays.asList(user);
        when(userRepository.findByLanguePreferee("FR")).thenReturn(users);
        when(userMapper.toDTO(user)).thenReturn(userDTO);

        // Act
        List<UserDTO> result = userService.getUsersByLangue("FR");

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(userRepository, times(1)).findByLanguePreferee("FR");
    }

    @Test
    void testGetUsersByPays() {
        // Arrange
        List<User> users = Arrays.asList(user);
        when(userRepository.findByPaysOrigine("France")).thenReturn(users);
        when(userMapper.toDTO(user)).thenReturn(userDTO);

        // Act
        List<UserDTO> result = userService.getUsersByPays("France");

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(userRepository, times(1)).findByPaysOrigine("France");
    }
}
