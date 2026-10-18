package com.iadaf.demarches.service;

import com.iadaf.demarches.dto.CreateDemarcheRequest;
import com.iadaf.demarches.entity.Demarche;
import com.iadaf.demarches.exception.UnauthorizedAccessException;
import com.iadaf.demarches.mapper.DemarcheMapper;
import com.iadaf.demarches.repository.DemarcheRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Les démarches sont cloisonnées par utilisateur : l'identité ne peut venir
 * que du jeton vérifié, jamais d'un en-tête que l'appelant écrit lui-même.
 */
class DemarcheServiceIdentityTest {

    private final DemarcheRepository repository = mock(DemarcheRepository.class);
    private final DemarcheMapper mapper = mock(DemarcheMapper.class);
    private final DemarcheService service = new DemarcheService(repository, mapper);

    @BeforeEach
    void setUp() {
        Demarche entity = new Demarche();
        when(mapper.toEntity(any(), anyString())).thenReturn(entity);
        when(repository.save(any())).thenReturn(entity);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void identityComesFromTheTokenSubject() {
        authenticate("user-1");

        service.createDemarche(new CreateDemarcheRequest());

        verify(mapper).toEntity(any(), org.mockito.ArgumentMatchers.eq("user-1"));
    }

    @Test
    void forgedXUserIdHeaderIsIgnored() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Id", "victim");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        assertThatThrownBy(() -> service.createDemarche(new CreateDemarcheRequest()))
                .isInstanceOf(UnauthorizedAccessException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void anonymousTokenIsRefused() {
        authenticate(null);

        assertThatThrownBy(() -> service.createDemarche(new CreateDemarcheRequest()))
                .isInstanceOf(UnauthorizedAccessException.class);
        verify(repository, never()).save(any());
    }

    private static void authenticate(String subject) {
        Jwt.Builder jwt = Jwt.withTokenValue("t").header("alg", "HS256").claim("iss", "iadaf-frontend");
        if (subject != null) {
            jwt.subject(subject);
        }
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt.build()));
    }
}
