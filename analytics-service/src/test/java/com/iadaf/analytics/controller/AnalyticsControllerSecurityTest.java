package com.iadaf.analytics.controller;

import com.iadaf.analytics.TestTokens;
import com.iadaf.analytics.config.SecurityConfig;
import com.iadaf.analytics.dto.DashboardSummaryDTO;
import com.iadaf.analytics.service.AnalyticsService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Les vues globales exigent le scope admin ; les statistiques personnelles, non. */
@WebMvcTest(AnalyticsController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class AnalyticsControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalyticsService analyticsService;

    @ParameterizedTest
    @ValueSource(strings = {"/analytics/dashboard", "/analytics/users/activity",
            "/analytics/documents/stats", "/analytics/performance"})
    void globalViewsAreForbiddenToAnOrdinaryAccount(String path) throws Exception {
        mockMvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(analyticsService);
    }

    @Test
    void anAdminReachesTheDashboard() throws Exception {
        when(analyticsService.getDashboardSummary()).thenReturn(new DashboardSummaryDTO());
        mockMvc.perform(get("/analytics/dashboard")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("admin-1", "admin")))
                .andExpect(status().isOk());
    }

    @Test
    void anAccountReadsStatisticsOfItsOwnDossiers() throws Exception {
        when(analyticsService.getDemarchesByStatut()).thenReturn(Map.of("EN_COURS", 1L));
        mockMvc.perform(get("/analytics/demarches/statut")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1")))
                .andExpect(status().isOk());
    }
}
