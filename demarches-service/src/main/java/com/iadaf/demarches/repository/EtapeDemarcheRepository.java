package com.iadaf.demarches.repository;

import com.iadaf.demarches.entity.EtapeDemarche;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EtapeDemarcheRepository extends JpaRepository<EtapeDemarche, Long> {
    
    List<EtapeDemarche> findByDemarcheIdOrderByOrdreAsc(Long demarcheId);
}
