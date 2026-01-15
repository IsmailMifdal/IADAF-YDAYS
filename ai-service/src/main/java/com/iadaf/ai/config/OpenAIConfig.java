package com.iadaf.ai.config;

import com.theokanning.openai.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
@RequiredArgsConstructor
public class OpenAIConfig {

    private final OpenAIProperties openAIProperties;

    @Bean
    public OpenAiService openAiService() {
        return new OpenAiService(
            openAIProperties.getApiKey(),
            Duration.ofMillis(openAIProperties.getTimeout())
        );
    }
}
