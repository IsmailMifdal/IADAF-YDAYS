package com.iadaf.ai.controller;

import com.iadaf.ai.dto.ChatRequest;
import com.iadaf.ai.dto.ChatResponse;
import com.iadaf.ai.dto.ConversationDTO;
import com.iadaf.ai.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        log.info("REST request to chat with AI");
        ChatResponse response = chatService.chat(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/conversation/{id}")
    public ResponseEntity<ConversationDTO> getConversation(@PathVariable Long id) {
        log.info("REST request to get conversation: {}", id);
        ConversationDTO conversation = chatService.getConversation(id);
        return ResponseEntity.ok(conversation);
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDTO>> getUserConversations() {
        log.info("REST request to get user conversations");
        List<ConversationDTO> conversations = chatService.getUserConversations();
        return ResponseEntity.ok(conversations);
    }

    @DeleteMapping("/conversation/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long id) {
        log.info("REST request to delete conversation: {}", id);
        chatService.deleteConversation(id);
        return ResponseEntity.noContent().build();
    }
}
