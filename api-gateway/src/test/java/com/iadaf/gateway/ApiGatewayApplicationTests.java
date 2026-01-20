package com.iadaf.gateway;

import com.iadaf.gateway.config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class ApiGatewayApplicationTests {

    @Test
    void contextLoads() {
        // Vérifie que le contexte Spring se charge correctement
    }
}
