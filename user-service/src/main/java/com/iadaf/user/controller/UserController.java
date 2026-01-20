package com.iadaf.user.controller;

import com.iadaf.user.dto.CreateUserRequest;
import com.iadaf.user.dto.UserDTO;
import com.iadaf.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody CreateUserRequest request) {
        log.info("REST request to create User");
        UserDTO createdUser = userService.createUser(request);
        return new ResponseEntity<>(createdUser, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        log.info("REST request to get all Users");
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        log.info("REST request to get User by id: {}", id);
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<UserDTO> getUserByEmail(@PathVariable String email) {
        log.info("REST request to get User by email: {}", email);
        UserDTO user = userService.getUserByEmail(email);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody CreateUserRequest request) {
        log.info("REST request to update User with id: {}", id);
        UserDTO updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        log.info("REST request to delete User with id: {}", id);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/langue/{langue}")
    public ResponseEntity<List<UserDTO>> getUsersByLangue(@PathVariable String langue) {
        log.info("REST request to get Users by langue: {}", langue);
        List<UserDTO> users = userService.getUsersByLangue(langue);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/pays/{pays}")
    public ResponseEntity<List<UserDTO>> getUsersByPays(@PathVariable String pays) {
        log.info("REST request to get Users by pays: {}", pays);
        List<UserDTO> users = userService.getUsersByPays(pays);
        return ResponseEntity.ok(users);
    }
}
