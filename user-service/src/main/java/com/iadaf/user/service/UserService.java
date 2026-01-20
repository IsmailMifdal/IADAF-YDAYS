package com.iadaf.user.service;

import com.iadaf.user.dto.CreateUserRequest;
import com.iadaf.user.dto.UserDTO;
import com.iadaf.user.entity.User;
import com.iadaf.user.exception.ResourceNotFoundException;
import com.iadaf.user.exception.UserAlreadyExistsException;
import com.iadaf.user.mapper.UserMapper;
import com.iadaf.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserDTO createUser(CreateUserRequest request) {
        log.info("Création d'un nouvel utilisateur avec email: {}", request.getEmail());
        
        // Vérifier si l'email existe déjà
        if (userRepository.existsByEmail(request.getEmail())) {
            log.error("L'email {} existe déjà", request.getEmail());
            throw new UserAlreadyExistsException(request.getEmail());
        }
        
        User user = userMapper.toEntity(request);
        User savedUser = userRepository.save(user);
        
        log.info("Utilisateur créé avec succès avec ID: {}", savedUser.getId());
        return userMapper.toDTO(savedUser);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        log.info("Récupération de tous les utilisateurs");
        return userRepository.findAll()
                .stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserDTO getUserById(Long id) {
        log.info("Récupération de l'utilisateur avec ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", "id", id));
        return userMapper.toDTO(user);
    }

    @Transactional(readOnly = true)
    public UserDTO getUserByEmail(String email) {
        log.info("Récupération de l'utilisateur avec email: {}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", "email", email));
        return userMapper.toDTO(user);
    }

    public UserDTO updateUser(Long id, CreateUserRequest request) {
        log.info("Mise à jour de l'utilisateur avec ID: {}", id);
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", "id", id));
        
        // Vérifier si le nouvel email existe déjà (sauf si c'est le même email)
        if (!user.getEmail().equals(request.getEmail()) && 
            userRepository.existsByEmail(request.getEmail())) {
            log.error("L'email {} existe déjà", request.getEmail());
            throw new UserAlreadyExistsException(request.getEmail());
        }
        
        userMapper.updateEntity(user, request);
        User updatedUser = userRepository.save(user);
        
        log.info("Utilisateur mis à jour avec succès avec ID: {}", updatedUser.getId());
        return userMapper.toDTO(updatedUser);
    }

    public void deleteUser(Long id) {
        log.info("Suppression de l'utilisateur avec ID: {}", id);
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", "id", id));
        
        userRepository.delete(user);
        log.info("Utilisateur supprimé avec succès avec ID: {}", id);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getUsersByLangue(String langue) {
        log.info("Récupération des utilisateurs par langue: {}", langue);
        return userRepository.findByLanguePreferee(langue)
                .stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getUsersByPays(String pays) {
        log.info("Récupération des utilisateurs par pays: {}", pays);
        return userRepository.findByPaysOrigine(pays)
                .stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }
}
