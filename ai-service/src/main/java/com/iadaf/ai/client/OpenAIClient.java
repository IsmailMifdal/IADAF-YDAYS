package com.iadaf.ai.client;

import com.iadaf.ai.config.OpenAIProperties;
import com.iadaf.ai.exception.OpenAIException;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatCompletionResult;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIClient {

    private final OpenAiService openAiService;
    private final OpenAIProperties openAIProperties;

    public ChatCompletionResult createChatCompletion(List<ChatMessage> messages) {
        try {
            log.debug("Envoi de la requête à OpenAI avec {} messages", messages.size());
            
            ChatCompletionRequest request = ChatCompletionRequest.builder()
                    .model(openAIProperties.getModel())
                    .messages(messages)
                    .temperature(openAIProperties.getTemperature())
                    .maxTokens(openAIProperties.getMaxTokens())
                    .build();

            ChatCompletionResult result = openAiService.createChatCompletion(request);
            
            log.debug("Réponse reçue de OpenAI avec {} choix", 
                    result.getChoices() != null ? result.getChoices().size() : 0);
            
            return result;
            
        } catch (Exception e) {
            log.error("Erreur lors de l'appel à OpenAI: {}", e.getMessage(), e);
            throw new OpenAIException("Erreur lors de la communication avec OpenAI", e);
        }
    }

    public String getChatResponse(List<ChatMessage> messages) {
        ChatCompletionResult result = createChatCompletion(messages);
        
        if (result.getChoices() == null || result.getChoices().isEmpty()) {
            throw new OpenAIException("Aucune réponse reçue de OpenAI");
        }
        
        return result.getChoices().get(0).getMessage().getContent();
    }
}
