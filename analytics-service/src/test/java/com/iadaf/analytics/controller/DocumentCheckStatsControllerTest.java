package com.iadaf.analytics.controller;

import com.iadaf.analytics.TestTokens;
import com.iadaf.analytics.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DocumentCheckStatsController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class DocumentCheckStatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NamedParameterJdbcTemplate jdbc;

    private void postChecks(String body, int expected) throws Exception {
        mockMvc.perform(post("/analytics/document-checks")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(expected));
    }

    @Test
    void anonymousCountsAreRecorded() throws Exception {
        postChecks("""
                {"category":"identity","checks":[{"id":"readable","status":"ok"},{"id":"expiry","status":"error"}]}""",
                204);
        verify(jdbc, times(2)).update(anyString(), any(SqlParameterSource.class));
    }

    @Test
    void freeTextCannotBeSmuggledIn() throws Exception {
        // A check id carrying a value read in the document is refused.
        postChecks("""
                {"category":"identity","checks":[{"id":"ERIKSSON ANNA","status":"ok"}]}""", 400);
        postChecks("""
                {"category":"passport-of-anna","checks":[]}""", 400);
        postChecks("""
                {"category":"identity","checks":[{"id":"expiry","status":"2031-01-01"}]}""", 400);
        verify(jdbc, never()).update(anyString(), any(SqlParameterSource.class));
    }

    private void postDispute(String body, int expected) throws Exception {
        mockMvc.perform(post("/analytics/document-checks/disputes")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(expected));
    }

    @Test
    void aContestedResultIsCountedAnonymously() throws Exception {
        postDispute("""
                {"category":"identity","id":"expiry","status":"error"}""", 204);
        verify(jdbc, times(1)).update(anyString(), any(SqlParameterSource.class));
    }

    @Test
    void aDisputeCarriesNoFreeText() throws Exception {
        postDispute("""
                {"category":"identity","id":"Mon titre expire en 2031","status":"error"}""", 400);
        postDispute("""
                {"category":"identity","id":"expiry","status":"2031-01-01"}""", 400);
        // "unknown" is shown without a verdict: nothing to contest.
        postDispute("""
                {"category":"identity","id":"expiry","status":"unknown"}""", 400);
        verify(jdbc, never()).update(anyString(), any(SqlParameterSource.class));
    }

    @Test
    void readingTotalsNeedsTheAnalyticsScope() throws Exception {
        mockMvc.perform(get("/analytics/document-checks")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/analytics/document-checks")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("ops", "analytics:read")))
                .andExpect(status().isOk());
    }
}
