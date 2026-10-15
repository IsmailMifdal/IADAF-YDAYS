package com.iadaf.user.config;

import com.iadaf.user.TestTokens;
import com.iadaf.user.controller.UserController;
import com.iadaf.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Contrat des jetons internes : seul un jeton du frontend, valide, passe. */
@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class SecurityConfigTest {

    private static final String ISSUER = "iadaf-frontend";
    private static final String AUDIENCE = "iadaf-backend";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    void validTokenIsAccepted() throws Exception {
        when(userService.getAllUsers()).thenReturn(List.of());

        mockMvc.perform(get("/users")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1")))
                .andExpect(status().isOk());
    }

    @Test
    void missingTokenIsRejected() throws Exception {
        mockMvc.perform(get("/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void forgedXUserIdHeaderIsNotAnIdentity() throws Exception {
        mockMvc.perform(get("/users").header("X-User-Id", "user-1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() throws Exception {
        String forged = TestTokens.sign(
                "an-attacker-key-that-is-also-32-bytes-long!!", ISSUER, AUDIENCE, "user-1", 60);
        expectRejected(forged);
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        // Au-delà des 60 s de tolérance d'horloge.
        expectRejected(TestTokens.sign(TestTokens.SECRET, ISSUER, AUDIENCE, "user-1", -120));
    }

    @Test
    void tokenFromAnotherIssuerIsRejected() throws Exception {
        expectRejected(TestTokens.sign(TestTokens.SECRET, "someone-else", AUDIENCE, "user-1", 60));
    }

    @Test
    void tokenForAnotherAudienceIsRejected() throws Exception {
        expectRejected(TestTokens.sign(TestTokens.SECRET, ISSUER, "another-api", "user-1", 60));
    }

    private void expectRejected(String token) throws Exception {
        mockMvc.perform(get("/users").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
