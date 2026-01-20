package com.iadaf.user.mapper;

import com.iadaf.user.dto.CreateUserRequest;
import com.iadaf.user.dto.UserDTO;
import com.iadaf.user.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserDTO toDTO(User user) {
        if (user == null) {
            return null;
        }
        
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setNom(user.getNom());
        dto.setPrenom(user.getPrenom());
        dto.setEmail(user.getEmail());
        dto.setTelephone(user.getTelephone());
        dto.setLanguePreferee(user.getLanguePreferee());
        dto.setNiveauFrancais(user.getNiveauFrancais());
        dto.setPaysOrigine(user.getPaysOrigine());
        dto.setVilleResidence(user.getVilleResidence());
        dto.setStatutActuel(user.getStatutActuel());
        dto.setNotes(user.getNotes());
        dto.setActif(user.getActif());
        dto.setDateCreation(user.getDateCreation());
        dto.setDateModification(user.getDateModification());
        
        return dto;
    }

    public User toEntity(CreateUserRequest request) {
        if (request == null) {
            return null;
        }
        
        User user = new User();
        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setEmail(request.getEmail());
        user.setTelephone(request.getTelephone());
        user.setLanguePreferee(request.getLanguePreferee());
        user.setNiveauFrancais(request.getNiveauFrancais());
        user.setPaysOrigine(request.getPaysOrigine());
        user.setVilleResidence(request.getVilleResidence());
        user.setStatutActuel(request.getStatutActuel());
        user.setNotes(request.getNotes());
        user.setActif(true);
        
        return user;
    }

    public void updateEntity(User user, CreateUserRequest request) {
        if (user == null || request == null) {
            return;
        }
        
        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setEmail(request.getEmail());
        user.setTelephone(request.getTelephone());
        user.setLanguePreferee(request.getLanguePreferee());
        user.setNiveauFrancais(request.getNiveauFrancais());
        user.setPaysOrigine(request.getPaysOrigine());
        user.setVilleResidence(request.getVilleResidence());
        user.setStatutActuel(request.getStatutActuel());
        user.setNotes(request.getNotes());
    }
}
