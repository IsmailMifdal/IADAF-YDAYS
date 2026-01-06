package com.iadaf.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iadaf.ai.client.OpenAIClient;
import com.iadaf.ai.dto.SuggestionDTO;
import com.iadaf.ai.exception.OpenAIException;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SuggestionService {

    private final OpenAIClient openAIClient;
    private final ObjectMapper objectMapper;

    public List<SuggestionDTO> suggestDemarches(String userProfile, String userHistory) {
        log.info("Génération de suggestions de démarches pour l'utilisateur");

        List<ChatMessage> messages = new ArrayList<>();
        
        String systemPrompt = "Tu es un expert en démarches administratives françaises. " +
                "Tu dois suggérer des démarches pertinentes basées sur le profil utilisateur. " +
                "Réponds au format JSON avec un tableau de suggestions. Chaque suggestion doit avoir: " +
                "{ \"demarcheId\": \"id\", \"demarcheTitle\": \"titre\", \"description\": \"description\", " +
                "\"reason\": \"pourquoi suggérer\", \"steps\": [\"étape 1\", \"étape 2\"], " +
                "\"priority\": 1-5, \"difficulty\": \"facile/moyen/difficile\" }";
        
        messages.add(new ChatMessage(ChatMessageRole.SYSTEM.value(), systemPrompt));

        String userPrompt = buildUserPrompt(userProfile, userHistory);
        messages.add(new ChatMessage(ChatMessageRole.USER.value(), userPrompt));

        String aiResponse = openAIClient.getChatResponse(messages);

        return parseSuggestions(aiResponse);
    }

    private String buildUserPrompt(String userProfile, String userHistory) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Profil de l'utilisateur:\n");
        prompt.append(userProfile != null ? userProfile : "Profil non disponible");
        
        if (userHistory != null && !userHistory.isEmpty()) {
            prompt.append("\n\nHistorique des démarches:\n");
            prompt.append(userHistory);
        }
        
        prompt.append("\n\nSuggère 3-5 démarches administratives pertinentes pour cet utilisateur.");
        
        return prompt.toString();
    }

    private List<SuggestionDTO> parseSuggestions(String jsonResponse) {
        try {
            // Clean up the response
            String cleanedResponse = jsonResponse.trim();
            if (cleanedResponse.startsWith("```json")) {
                cleanedResponse = cleanedResponse.substring(7);
            }
            if (cleanedResponse.startsWith("```")) {
                cleanedResponse = cleanedResponse.substring(3);
            }
            if (cleanedResponse.endsWith("```")) {
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length() - 3);
            }
            cleanedResponse = cleanedResponse.trim();

            // Try to parse as array first
            if (cleanedResponse.startsWith("[")) {
                return objectMapper.readValue(
                        cleanedResponse, 
                        new TypeReference<List<SuggestionDTO>>() {}
                );
            } else {
                // Try to extract array from object
                Map<String, Object> responseMap = objectMapper.readValue(
                        cleanedResponse, 
                        new TypeReference<Map<String, Object>>() {}
                );
                
                // Look for array in common keys
                for (String key : new String[]{"suggestions", "demarches", "results", "data"}) {
                    if (responseMap.containsKey(key)) {
                        Object value = responseMap.get(key);
                        if (value instanceof List) {
                            String arrayJson = objectMapper.writeValueAsString(value);
                            return objectMapper.readValue(
                                    arrayJson, 
                                    new TypeReference<List<SuggestionDTO>>() {}
                            );
                        }
                    }
                }
            }

            log.warn("Format de réponse inattendu, retour d'une liste vide");
            return new ArrayList<>();

        } catch (JsonProcessingException e) {
            log.error("Erreur lors du parsing des suggestions: {}", e.getMessage());
            return createFallbackSuggestions();
        }
    }

    private List<SuggestionDTO> createFallbackSuggestions() {
        List<SuggestionDTO> fallback = new ArrayList<>();
        
        SuggestionDTO suggestion = new SuggestionDTO();
        suggestion.setDemarcheId("carte_sejour");
        suggestion.setDemarcheTitle("Demande de carte de séjour");
        suggestion.setDescription("Obtenir ou renouveler une carte de séjour");
        suggestion.setReason("Démarche commune pour les résidents étrangers");
        suggestion.setSteps(List.of(
                "Prendre rendez-vous en préfecture",
                "Préparer les documents requis",
                "Se présenter au rendez-vous"
        ));
        suggestion.setPriority(2);
        suggestion.setDifficulty("moyen");
        
        fallback.add(suggestion);
        return fallback;
    }
}
