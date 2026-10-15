package com.iadaf.document.repository;

import com.iadaf.document.entity.DocumentContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DocumentContentRepository extends JpaRepository<DocumentContent, UUID> {
}
