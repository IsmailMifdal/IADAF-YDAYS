package com.iadaf.discovery;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "eureka.client.register-with-eureka=false",
    "eureka.client.fetch-registry=false"
})
class DiscoveryServiceApplicationTests {

    @Test
    void contextLoads() {
        // Vérifie que le contexte Spring se charge correctement
    }
}
