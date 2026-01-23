package com.iadaf.demarches;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class DemarchesServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemarchesServiceApplication.class, args);
    }
}
