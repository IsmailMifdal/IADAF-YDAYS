package com.iadaf.document.repository;

import com.iadaf.document.entity.StoredDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<StoredDocument, UUID> {

    List<StoredDocument> findByUserIdAndPackSlugOrderByCreatedAtAsc(String userId, String packSlug);

    Optional<StoredDocument> findByIdAndUserId(UUID id, String userId);

    Optional<StoredDocument> findByUserIdAndPackSlugAndDocumentType(
            String userId, String packSlug, String documentType);

    /** Le contenu chiffré suit (ON DELETE CASCADE). */
    @Modifying
    @Query("DELETE FROM StoredDocument d WHERE d.userId = :userId")
    int deleteAllByUserId(@Param("userId") String userId);

    @Modifying
    @Query("DELETE FROM StoredDocument d WHERE d.createdAt < :cutoff")
    int deleteCreatedBefore(@Param("cutoff") OffsetDateTime cutoff);
}
