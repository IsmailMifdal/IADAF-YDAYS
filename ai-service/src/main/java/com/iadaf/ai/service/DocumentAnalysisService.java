package com.iadaf.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iadaf.ai.client.OpenAIClient;
import com.iadaf.ai.dto.AnalysisResult;
import com.iadaf.ai.dto.DocumentAnalysisRequest;
import com.iadaf.ai.exception.OpenAIException;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentAnalysisService {

    private final OpenAIClient openAIClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AnalysisResult analyzeDocument(DocumentAnalysisRequest request) {
        log.info("Analyse d'un document de type: {}", request.getDocumentType());

        List<ChatMessage> messages = new ArrayList<>();
        
        String systemPrompt = buildSystemPrompt(request.getLanguage());
        messages.add(new ChatMessage(ChatMessageRole.SYSTEM.value(), systemPrompt));

        String userPrompt = buildUserPrompt(request);
        messages.add(new ChatMessage(ChatMessageRole.USER.value(), userPrompt));

        String aiResponse = openAIClient.getChatResponse(messages);

        return parseAnalysisResult(aiResponse, request.getDocumentType());
    }

    private String buildSystemPrompt(String language) {
        String lang = language != null ? language : "FR";
        
        String basePrompt = "Tu es un expert en analyse de documents administratifs français. " +
                "Tu dois analyser le contenu du document et extraire les informations clés de manière structurée. " +
                "Réponds toujours au format JSON avec les champs suivants: " +
                "{ \"documentType\": \"type du document\", " +
                "\"extractedInfo\": { \"nom\": \"...\", \"prenom\": \"...\", \"date_naissance\": \"...\", \"adresse\": \"...\", etc. }, " +
                "\"summary\": \"résumé du document\", " +
                "\"suggestedActions\": [\"action 1\", \"action 2\"], " +
                "\"confidence\": 0.95 }";

        if ("EN".equalsIgnoreCase(lang)) {
            basePrompt = "You are an expert in analyzing French administrative documents. " +
                    "You must analyze the document content and extract key information in a structured way. " +
                    "Always respond in JSON format with the following fields: " +
                    "{ \"documentType\": \"document type\", " +
                    "\"extractedInfo\": { \"name\": \"...\", \"firstname\": \"...\", \"birth_date\": \"...\", \"address\": \"...\", etc. }, " +
                    "\"summary\": \"document summary\", " +
                    "\"suggestedActions\": [\"action 1\", \"action 2\"], " +
                    "\"confidence\": 0.95 }";
        } else if ("AR".equalsIgnoreCase(lang)) {
            basePrompt = "أنت خبير في تحليل الوثائق الإدارية الفرنسية. " +
                    "يجب عليك تحليل محتوى الوثيقة واستخراج المعلومات الرئيسية بطريقة منظمة. " +
                    "قم دائمًا بالرد بصيغة JSON مع الحقول التالية: " +
                    "{ \"documentType\": \"نوع الوثيقة\", " +
                    "\"extractedInfo\": { \"الاسم\": \"...\", \"الاسم_الأول\": \"...\", \"تاريخ_الميلاد\": \"...\", \"العنوان\": \"...\", إلخ }, " +
                    "\"summary\": \"ملخص الوثيقة\", " +
                    "\"suggestedActions\": [\"إجراء 1\", \"إجراء 2\"], " +
                    "\"confidence\": 0.95 }";
        }

        return basePrompt;
    }

    private String buildUserPrompt(DocumentAnalysisRequest request) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Analyse le document suivant:\n\n");
        prompt.append(request.getDocumentContent());
        
        if (request.getDocumentType() != null) {
            prompt.append("\n\nType de document indiqué: ").append(request.getDocumentType());
        }
        
        prompt.append("\n\nExtrait toutes les informations pertinentes et suggère les actions appropriées.");
        
        return prompt.toString();
    }

    private AnalysisResult parseAnalysisResult(String jsonResponse, String expectedType) {
        try {
            // Clean up the response - remove markdown code blocks if present
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

            // Parse JSON response
            Map<String, Object> resultMap = objectMapper.readValue(
                    cleanedResponse, 
                    new TypeReference<Map<String, Object>>() {}
            );

            AnalysisResult result = new AnalysisResult();
            result.setDocumentType((String) resultMap.getOrDefault("documentType", expectedType));
            
            @SuppressWarnings("unchecked")
            Map<String, String> extractedInfo = (Map<String, String>) resultMap.get("extractedInfo");
            result.setExtractedInfo(extractedInfo != null ? extractedInfo : new HashMap<>());
            
            result.setSummary((String) resultMap.getOrDefault("summary", ""));
            
            @SuppressWarnings("unchecked")
            List<String> actions = (List<String>) resultMap.get("suggestedActions");
            result.setSuggestedActions(actions != null ? actions : new ArrayList<>());
            
            Object confidence = resultMap.get("confidence");
            if (confidence instanceof Number) {
                result.setConfidence(((Number) confidence).doubleValue());
            } else {
                result.setConfidence(0.8);
            }

            return result;

        } catch (JsonProcessingException e) {
            log.error("Erreur lors du parsing de la réponse JSON: {}", e.getMessage());
            
            // Fallback: create a basic result with the raw response
            AnalysisResult fallbackResult = new AnalysisResult();
            fallbackResult.setDocumentType(expectedType != null ? expectedType : "unknown");
            fallbackResult.setExtractedInfo(new HashMap<>());
            fallbackResult.setSummary(jsonResponse);
            fallbackResult.setSuggestedActions(new ArrayList<>());
            fallbackResult.setConfidence(0.5);
            
            return fallbackResult;
        }
    }
}
