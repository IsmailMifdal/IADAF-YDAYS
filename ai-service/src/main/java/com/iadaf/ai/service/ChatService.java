package com.iadaf.ai.service;

import com.iadaf.ai.client.OpenAIClient;
import com.iadaf.ai.dto.*;
import com.iadaf.ai.entity.Conversation;
import com.iadaf.ai.entity.Message;
import com.iadaf.ai.exception.ResourceNotFoundException;
import com.iadaf.ai.repository.ConversationRepository;
import com.iadaf.ai.repository.MessageRepository;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ChatService {

    private final OpenAIClient openAIClient;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    public ChatResponse chat(ChatRequest request) {
        String userId = getCurrentUserId();
        log.info("Traitement d'une requête de chat pour l'utilisateur: {}", userId);

        Conversation conversation;
        List<ChatMessage> messages = new ArrayList<>();

        // Load or create conversation
        if (request.getConversationId() != null) {
            conversation = conversationRepository.findByIdAndUserId(
                    request.getConversationId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Conversation", "id", request.getConversationId()));
            
            // Load previous messages for context
            List<Message> previousMessages = messageRepository
                    .findByConversationIdOrderByCreatedAtAsc(conversation.getId());
            
            messages.addAll(previousMessages.stream()
                    .map(m -> new ChatMessage(m.getRole(), m.getContent()))
                    .collect(Collectors.toList()));
        } else {
            conversation = new Conversation();
            conversation.setUserId(userId);
            String message = request.getMessage();
            if (message != null && !message.isEmpty()) {
                conversation.setTitle(message.substring(0, Math.min(50, message.length())));
            } else {
                conversation.setTitle("Nouvelle conversation");
            }
            conversation = conversationRepository.save(conversation);
        }

        // Add system message if it's a new conversation
        if (messages.isEmpty()) {
            messages.add(new ChatMessage(ChatMessageRole.SYSTEM.value(), 
                    "Tu es un assistant intelligent pour aider les utilisateurs avec les démarches administratives françaises. " +
                    "Tu réponds de manière claire, concise et utile. " +
                    (request.getContext() != null ? "Contexte additionnel: " + request.getContext() : "")));
        }

        // Add user message
        messages.add(new ChatMessage(ChatMessageRole.USER.value(), request.getMessage()));

        // Save user message
        Message userMessage = new Message();
        userMessage.setRole(ChatMessageRole.USER.value());
        userMessage.setContent(request.getMessage());
        conversation.addMessage(userMessage);

        // Get AI response
        String aiResponse = openAIClient.getChatResponse(messages);

        // Save assistant message
        Message assistantMessage = new Message();
        assistantMessage.setRole(ChatMessageRole.ASSISTANT.value());
        assistantMessage.setContent(aiResponse);
        conversation.addMessage(assistantMessage);

        conversationRepository.save(conversation);

        log.info("Réponse générée pour la conversation: {}", conversation.getId());

        return new ChatResponse(
                aiResponse,
                conversation.getId(),
                ChatMessageRole.ASSISTANT.value(),
                null // Token count could be added if needed
        );
    }

    @Transactional(readOnly = true)
    public ConversationDTO getConversation(Long conversationId) {
        String userId = getCurrentUserId();
        
        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", "id", conversationId));

        return convertToDTO(conversation);
    }

    @Transactional(readOnly = true)
    public List<ConversationDTO> getUserConversations() {
        String userId = getCurrentUserId();
        
        List<Conversation> conversations = conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        
        return conversations.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public void deleteConversation(Long conversationId) {
        String userId = getCurrentUserId();
        
        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", "id", conversationId));
        
        conversationRepository.delete(conversation);
        
        log.info("Conversation {} supprimée pour l'utilisateur {}", conversationId, userId);
    }

    private ConversationDTO convertToDTO(Conversation conversation) {
        List<MessageDTO> messageDTOs = conversation.getMessages().stream()
                .map(m -> new MessageDTO(m.getId(), m.getRole(), m.getContent(), m.getCreatedAt()))
                .collect(Collectors.toList());

        return new ConversationDTO(
                conversation.getId(),
                conversation.getTitle(),
                messageDTOs,
                conversation.getCreatedAt(),
                conversation.getUpdatedAt()
        );
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            // Try to get user ID from different JWT claims
            String userId = jwt.getClaimAsString("sub");
            if (userId == null) {
                userId = jwt.getClaimAsString("preferred_username");
            }
            if (userId == null) {
                userId = jwt.getClaimAsString("email");
            }
            return userId != null ? userId : "anonymous";
        }
        return "anonymous";
    }
}
