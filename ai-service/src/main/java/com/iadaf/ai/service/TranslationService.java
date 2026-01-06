package com.iadaf.ai.service;

import com.iadaf.ai.client.OpenAIClient;
import com.iadaf.ai.dto.TranslationRequest;
import com.iadaf.ai.dto.TranslationResponse;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranslationService {

    private final OpenAIClient openAIClient;

    public TranslationResponse translate(TranslationRequest request) {
        log.info("Traduction du texte vers: {}", request.getTargetLanguage());

        List<ChatMessage> messages = new ArrayList<>();
        
        String systemPrompt = buildSystemPrompt(request.getTargetLanguage());
        messages.add(new ChatMessage(ChatMessageRole.SYSTEM.value(), systemPrompt));

        String userPrompt = "Traduis le texte suivant:\n\n" + request.getText();
        messages.add(new ChatMessage(ChatMessageRole.USER.value(), userPrompt));

        String translatedText = openAIClient.getChatResponse(messages);

        // Detect source language if not provided
        String sourceLanguage = request.getSourceLanguage();
        if (sourceLanguage == null) {
            sourceLanguage = detectLanguage(request.getText());
        }

        return new TranslationResponse(
                translatedText,
                sourceLanguage,
                request.getTargetLanguage()
        );
    }

    private String buildSystemPrompt(String targetLanguage) {
        String languageName = getLanguageName(targetLanguage);
        
        return String.format(
                "Tu es un traducteur professionnel. Tu traduis uniquement le texte vers %s. " +
                "Ne fournis que la traduction, sans explications ni commentaires. " +
                "Préserve le formatage et la ponctuation.",
                languageName
        );
    }

    private String getLanguageName(String code) {
        return switch (code.toUpperCase()) {
            case "FR" -> "français";
            case "EN" -> "anglais";
            case "AR" -> "arabe";
            case "ES" -> "espagnol";
            default -> code;
        };
    }

    private String detectLanguage(String text) {
        // Simple heuristic detection
        if (text.matches(".*[\\u0600-\\u06FF].*")) {
            return "AR"; // Arabic
        } else if (text.matches(".*[àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ].*")) {
            return "FR"; // French
        } else if (text.matches(".*[ñáéíóúÑÁÉÍÓÚ].*")) {
            return "ES"; // Spanish
        }
        return "EN"; // Default to English
    }
}
