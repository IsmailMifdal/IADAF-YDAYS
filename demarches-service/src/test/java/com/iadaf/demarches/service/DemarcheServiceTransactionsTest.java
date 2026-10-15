package com.iadaf.demarches.service;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Les méthodes qui écrivent ne doivent jamais hériter d'un
 * {@code @Transactional(readOnly = true)} : une annotation déplacée par erreur
 * a déjà fait échouer en production chaque création de dossier de pack
 * (« cannot execute INSERT in a read-only transaction »), invisible des tests
 * de contrôleur où le service est simulé.
 */
class DemarcheServiceTransactionsTest {

    @Test
    void writingMethodsAreNotReadOnly() {
        for (String name : new String[]{"ensurePackFolder", "updatePackStep", "eraseCurrentUserData",
                "createDemarche", "updateDemarche", "deleteDemarche", "updateStatut"}) {
            Method method = Arrays.stream(DemarcheService.class.getDeclaredMethods())
                    .filter(m -> m.getName().equals(name))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("Méthode absente : " + name));
            Transactional transactional = method.getAnnotation(Transactional.class);
            assertThat(transactional == null || !transactional.readOnly())
                    .as("%s ne doit pas être en lecture seule", name)
                    .isTrue();
        }
    }
}
