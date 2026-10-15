package com.iadaf.demarches.controller;

import com.iadaf.demarches.TestTokens;
import com.iadaf.demarches.config.SecurityConfig;
import com.iadaf.demarches.dto.DemarcheDTO;
import com.iadaf.demarches.service.DemarcheService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DemarcheController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class DemarcheControllerSecurityTest {

    private static final String FOLDER = """
            {"titre":"Titre de séjour (ANEF)","typeDemarche":"TITRE_SEJOUR",
             "organismeConcerne":"Préfecture","etapes":["Passeport","Visa"]}""";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DemarcheService service;

    @Test
    void packFolderIsEnsured() throws Exception {
        DemarcheDTO dto = new DemarcheDTO();
        dto.setPackSlug("titre-sejour");
        when(service.ensurePackFolder(eq("titre-sejour"), any())).thenReturn(dto);

        mockMvc.perform(put("/demarches/packs/titre-sejour")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1"))
                        .contentType(MediaType.APPLICATION_JSON).content(FOLDER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.packSlug").value("titre-sejour"));
    }

    @Test
    void invalidPackSlugIsABadRequest() throws Exception {
        mockMvc.perform(put("/demarches/packs/NOT_a_slug!")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1"))
                        .contentType(MediaType.APPLICATION_JSON).content(FOLDER))
                .andExpect(status().isBadRequest());
    }

    @Test
    void malformedBodyIsABadRequestNotAServerError() throws Exception {
        mockMvc.perform(put("/demarches/packs/titre-sejour")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1"))
                        .contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void erasureWithoutTheScopeIsForbidden() throws Exception {
        mockMvc.perform(delete("/demarches/me")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1")))
                .andExpect(status().isForbidden());
        verify(service, never()).eraseCurrentUserData();
    }

    @Test
    void erasureWithTheScopeSucceeds() throws Exception {
        when(service.eraseCurrentUserData()).thenReturn(3);

        mockMvc.perform(delete("/demarches/me")
                        .header(HttpHeaders.AUTHORIZATION, TestTokens.bearer("user-1", "account:erase")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deletedDemarches").value(3));
    }
}
