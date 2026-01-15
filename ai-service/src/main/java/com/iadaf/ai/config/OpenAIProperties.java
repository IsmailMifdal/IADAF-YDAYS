package com.iadaf.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "ai.openai")
@Data
public class OpenAIProperties {
    
    private String apiKey;
    private String model;
    private Double temperature;
    private Integer maxTokens;
    private Integer timeout;
}
