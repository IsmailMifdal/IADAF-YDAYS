package com.iadaf.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {

    private String response;
    
    private Long conversationId;
    
    private String role; // "assistant"
    
    private Integer tokensUsed;
}
