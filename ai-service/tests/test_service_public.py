"""service-public.gouv.fr fiches → knowledge-base passages."""

import io
import zipfile

import pytest

from app.knowledge.service_public import (
    ATTRIBUTION,
    MAX_PASSAGE_CHARS,
    FicheError,
    fiche_to_entries,
    read_archive,
)

FICHE = """<?xml version="1.0" encoding="UTF-8"?>
<Publication xmlns:dc="http://purl.org/dc/elements/1.1/" ID="F99" type="Fiche d'information"
  dateDerniereModificationImportante="2026-04-01T00:00:00"
  spUrl="https://www.service-public.gouv.fr/particuliers/vosdroits/F99">
  <dc:title>RSA : demandeur de 25 ans et plus</dc:title>
  <dc:description>Le RSA assure un revenu minimum.</dc:description>
  <FilDAriane><Niveau ID="N1">Navigation à ignorer</Niveau></FilDAriane>
  <Introduction><Texte><Paragraphe>Il est versé par la <LienInterne>Caf</LienInterne>.</Paragraphe></Texte></Introduction>
  <Texte>
    <ASavoir><Titre>À savoir</Titre><Paragraphe>La demande se fait en ligne.</Paragraphe></ASavoir>
    <Chapitre>
      <Titre><Paragraphe>Conditions</Paragraphe></Titre>
      <Liste type="puce">
        <Item><Paragraphe>Avoir 25 ans</Paragraphe></Item>
        <Item><Paragraphe>Résider en France</Paragraphe></Item>
      </Liste>
    </Chapitre>
  </Texte>
  <ListeSituations>
    <Situation>
      <Titre>Caf</Titre>
      <Texte>
        <Chapitre>
          <Titre><Paragraphe>Montant</Paragraphe></Titre>
          <BlocCas>
            <Cas><Titre>Vous vivez seul(e)</Titre><Paragraphe>651,69 € par mois.</Paragraphe></Cas>
            <Cas><Titre>Vous vivez en couple</Titre>
              <Tableau>
                <TitreRiche><Paragraphe>Montant pour un couple</Paragraphe></TitreRiche>
                <Rangée type="header"><Cellule><Paragraphe>Enfants</Paragraphe></Cellule><Cellule><Paragraphe>Montant</Paragraphe></Cellule></Rangée>
                <Rangée type="normal"><Cellule><Paragraphe>0</Paragraphe></Cellule><Cellule><Paragraphe><Valeur>977,54 €</Valeur></Paragraphe></Cellule></Rangée>
              </Tableau>
            </Cas>
          </BlocCas>
        </Chapitre>
      </Texte>
    </Situation>
  </ListeSituations>
  <ServiceEnLigne ID="R1" URL="https://wwwd.caf.fr/wps/portal/caffr/aidesetdemarches?page=rsa&amp;utm_source=sp&amp;utm_campaign=rsa" type="Téléservice">
    <Titre>Demander le RSA</Titre>
  </ServiceEnLigne>
  <ServiceEnLigne ID="R2" URL="https://www.formulaires.service-public.gouv.fr/gf/cerfa_15481.do" type="Formulaire" numerocerfa="15481*02">
    <Titre>Demande de RSA</Titre>
  </ServiceEnLigne>
  <ServiceEnLigne ID="R3" URL="https://connexion.example.fr/oauth2/authorize?response_type=code&amp;nonce=19cd80ec711fd0123456789&amp;redirect_uri=https%3A%2F%2Fassure.example.fr%2FPortail%3F_pageLabel%3Das_login_page%26cb%3Dtrue" type="Téléservice">
    <Titre>Se connecter</Titre>
  </ServiceEnLigne>
</Publication>
""".encode("utf-8")


def by_title(entries):
    return {entry["title"]: entry["contenu"] for entry in entries}


def test_every_passage_cites_its_source_and_date():
    entries = fiche_to_entries(FICHE)
    assert [entry["id"] for entry in entries] == [f"sp-F99-{i}" for i in range(1, len(entries) + 1)]
    for entry in entries:
        assert entry["lien_officiel"] == "https://www.service-public.gouv.fr/particuliers/vosdroits/F99"
        assert entry["mis_a_jour"] == "2026-04-01"
        assert entry["source"] == ATTRIBUTION  # Licence Ouverte: source and date


def test_text_is_kept_by_section_and_navigation_dropped():
    sections = by_title(fiche_to_entries(FICHE))
    title = "RSA : demandeur de 25 ans et plus"
    assert sections[f"{title} — Présentation"] == "Le RSA assure un revenu minimum.\nIl est versé par la Caf."
    assert sections[f"{title} — Conditions"] == "- Avoir 25 ans\n- Résider en France"
    assert sections[title] == "À savoir : La demande se fait en ligne."
    assert "Navigation" not in "".join(sections.values())


def test_situations_cases_and_tables_keep_the_amounts_readable():
    amounts = by_title(fiche_to_entries(FICHE))["RSA : demandeur de 25 ans et plus — Caf — Montant"]
    assert amounts.split("\n") == [
        "Cas « Vous vivez seul(e) » : 651,69 € par mois.",
        "Cas « Vous vivez en couple » : Montant pour un couple",
        "Enfants | Montant",
        "0 | 977,54 €",
    ]


def test_online_services_list_forms_without_tracking_urls():
    services = by_title(fiche_to_entries(FICHE))["RSA : demandeur de 25 ans et plus — Services en ligne et formulaires"]
    assert services.split("\n") == [
        "- Demander le RSA (Téléservice) : https://wwwd.caf.fr/wps/portal/caffr/aidesetdemarches?page=rsa",
        "- Demande de RSA (Formulaire, cerfa n° 15481*02) : "
        "https://www.formulaires.service-public.gouv.fr/gf/cerfa_15481.do",
        # A sign-in redirect: only where it leads is worth keeping.
        "- Se connecter (Téléservice) : https://connexion.example.fr/oauth2/authorize",
    ]


def test_long_text_is_cut_into_passages_the_embedder_can_read():
    paragraphs = "".join(f"<Paragraphe>Phrase numéro {i} sur les conditions du titre.</Paragraphe>" for i in range(80))
    fiche = FICHE.replace(b"<Paragraphe>Avoir 25 ans</Paragraphe>", paragraphs.encode("utf-8"))
    entries = fiche_to_entries(fiche)
    assert max(len(entry["contenu"]) for entry in entries) <= MAX_PASSAGE_CHARS
    joined = "\n".join(entry["contenu"] for entry in entries)
    assert "Phrase numéro 0 " in joined and "Phrase numéro 79 " in joined


@pytest.mark.parametrize(
    "xml",
    [
        b'<?xml version="1.0"?><!DOCTYPE p [<!ENTITY a "aaaa">]><Publication ID="F1">&a;</Publication>',
        b'<Publication ID="R123"><Texte/></Publication>',
    ],
    ids=["entity-declaration", "not-a-fiche"],
)
def test_untrusted_input_is_refused(xml):
    with pytest.raises(FicheError):
        fiche_to_entries(xml)


def test_only_the_requested_fiches_are_read_from_the_archive():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("F99.xml", FICHE)
        archive.writestr("F100.xml", b"<Publication ID='F100'/>")
        archive.writestr("R1.xml", b"<Publication ID='R1'/>")
    assert read_archive(buffer.getvalue(), ["F99"]) == {"F99": FICHE}
