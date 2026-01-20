package com.iadaf.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    @NotBlank(message = "Le message ne peut pas être vide")
    private String message;

    private Long conversationId; // Optional, for continuing a conversation

    private String context; // Optional additional context
}
