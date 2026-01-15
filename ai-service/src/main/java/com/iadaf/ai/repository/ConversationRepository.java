package com.iadaf.ai.repository;

import com.iadaf.ai.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    
    List<Conversation> findByUserIdOrderByUpdatedAtDesc(String userId);
    
    Optional<Conversation> findByIdAndUserId(Long id, String userId);
    
    void deleteByIdAndUserId(Long id, String userId);
}
