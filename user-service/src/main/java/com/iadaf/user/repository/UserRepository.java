package com.iadaf.user.repository;

import com.iadaf.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    List<User> findByLanguePreferee(String languePreferee);
    
    List<User> findByPaysOrigine(String paysOrigine);
    
    List<User> findByActif(Boolean actif);
}
