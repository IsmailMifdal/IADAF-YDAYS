package com.iadaf.demarches.repository;

import com.iadaf.demarches.entity.Demarche;
import com.iadaf.demarches.enums.StatutDemarche;
import com.iadaf.demarches.enums.TypeDemarche;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DemarcheRepository extends JpaRepository<Demarche, Long> {
    
    List<Demarche> findByUserIdAndActiveTrue(String userId);
    
    Optional<Demarche> findByIdAndUserId(Long id, String userId);
    
    List<Demarche> findByUserIdAndStatutAndActiveTrue(String userId, StatutDemarche statut);
    
    List<Demarche> findByUserIdAndTypeDemarcheAndActiveTrue(String userId, TypeDemarche typeDemarche);
    
    @Query("SELECT d FROM Demarche d WHERE d.userId = :userId AND d.active = true " +
           "AND d.dateEcheance < :today AND d.statut != com.iadaf.demarches.enums.StatutDemarche.TERMINEE " +
           "AND d.statut != com.iadaf.demarches.enums.StatutDemarche.ANNULEE")
    List<Demarche> findOverdueDemarches(@Param("userId") String userId, @Param("today") LocalDate today);
    
    boolean existsByIdAndUserId(Long id, String userId);
}
