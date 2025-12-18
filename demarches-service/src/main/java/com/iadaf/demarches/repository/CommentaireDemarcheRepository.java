package com.iadaf.demarches.repository;

import com.iadaf.demarches.entity.CommentaireDemarche;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentaireDemarcheRepository extends JpaRepository<CommentaireDemarche, Long> {
    
    List<CommentaireDemarche> findByDemarcheIdOrderByDateCreationDesc(Long demarcheId);
}
