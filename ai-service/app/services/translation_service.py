"""Translation service — translates text via the LLM."""

from typing import Dict

from loguru import logger

from app.services.llm_service import llm_service

# Supported language names for human-readable prompts
_LANGUAGE_NAMES: Dict[str, str] = {
    "FR": "français",
    "EN": "anglais",
    "AR": "arabe",
    "ES": "espagnol",
}


class TranslationService:
    """Translates text between supported languages using the LLM."""

    SUPPORTED_LANGUAGES = set(_LANGUAGE_NAMES.keys())

    def translate(
        self,
        text: str,
        target_language: str,
        source_language: str = "FR",
    ) -> str:
        """Translate *text* from *source_language* to *target_language*.

        Args:
            text: The text to translate.
            target_language: ISO language code of the target language.
            source_language: ISO language code of the source language.

        Returns:
            The translated text string.
        """
        src = source_language.upper()
        tgt = target_language.upper()

        src_name = _LANGUAGE_NAMES.get(src, src)
        tgt_name = _LANGUAGE_NAMES.get(tgt, tgt)

        prompt = (
            f"Traduis le texte suivant du {src_name} vers le {tgt_name}.\n"
            f"Réponds UNIQUEMENT avec la traduction, sans explication supplémentaire.\n\n"
            f"Texte à traduire :\n{text}\n\n"
            f"Traduction en {tgt_name} :"
        )

        logger.debug(f"Translation request: {src} → {tgt}")
        return llm_service.generate(prompt)


# Module-level singleton
translation_service = TranslationService()
