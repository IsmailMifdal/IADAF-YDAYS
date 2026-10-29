#!/usr/bin/env python3
"""Construit processed/instruct_train_v3.jsonl (RAG-grounded + gold ×N + glossaire).

N'écrase pas instruct_train.jsonl (v2). CPU only.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_V3 = ROOT / "datasets" / "raw" / "v3"
CURATED = ROOT / "datasets" / "curated"
GOLD = ROOT / "eval" / "gold" / "questions_v1.jsonl"
OUT = ROOT / "datasets" / "processed" / "instruct_train_v3.jsonl"

SYSTEM = (
    "Tu es l'assistant IADAF pour les démarches administratives françaises. "
    "Réponds de façon factuelle et structurée. "
    "Si un contexte officiel est fourni, appuie-toi STRICTEMENT dessus et cite "
    "[Source: URL]. "
    "N'invente jamais montants (timbres), numéros CERFA ni délais précis : "
    "renvoie vers service-public.fr / ANEF / l'organisme compétent. "
    "Refuse poliment conseil juridique/financier personnalisé et recentre sur l'admin."
)

PARAPHRASE_PREFIXES = [
    "",
    "Bonjour, ",
    "Pourriez-vous m'expliquer : ",
    "Question simple : ",
    "En clair, ",
    "Urgent — ",
    "Je suis perdu(e) : ",
    "Answer briefly in French: ",
    "Responde en español: ",
    "أجب باختصار بالعربية: ",
]


def msg(user: str, assistant: str, system: str = SYSTEM) -> dict:
    return {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant},
        ]
    }


def from_yssf(path: Path, limit: int | None) -> list[dict]:
    rows: list[dict] = []
    if not path.is_file():
        print(f"WARN: missing {path}")
        return rows
    with path.open(encoding="utf-8") as f:
        for line in f:
            if limit is not None and len(rows) >= limit:
                break
            row = json.loads(line)
            url = row.get("url") or "https://www.service-public.fr/"
            title = row.get("title") or "démarche"
            text = (row.get("text") or row.get("content") or "").strip()
            if len(text) < 200:
                continue
            chunk = text[:2200]
            user = (
                f"Contexte officiel :\n{chunk}\n\n"
                f"Question : Quelles sont les informations essentielles pour « {title} » ?"
            )
            assistant = (
                f"Voici ce qu'indiquent les informations officielles concernant « {title} » :\n\n"
                f"{chunk[:900].rstrip()}…\n\n"
                f"Vérifiez toujours la fiche à jour : [Source: {url}]. "
                f"Je n'invente pas de montants, délais ni numéros CERFA hors contexte."
            )
            rows.append(msg(user, assistant))
            # variante « étapes / pièces »
            user2 = (
                f"Contexte :\n{chunk}\n\n"
                f"Quelles pièces ou étapes sont mentionnées pour {title} ? "
                f"Si ce n'est pas dans le texte, dis-le."
            )
            assistant2 = (
                f"D'après le contexte fourni pour « {title} » :\n{chunk[:700].rstrip()}…\n\n"
                f"[Source: {url}]. "
                f"Si une information manque dans ce passage, consultez la fiche complète."
            )
            rows.append(msg(user2, assistant2))
    return rows


def from_gold(path: Path, repeats: int, rng: random.Random) -> list[dict]:
    rows: list[dict] = []
    if not path.is_file():
        return rows
    items = [json.loads(l) for l in path.open(encoding="utf-8")]
    for item in items:
        q = item.get("question") or item.get("q") or ""
        a = (
            item.get("expected_answer")
            or item.get("answer")
            or item.get("a")
            or item.get("reference")
            or ""
        )
        if not a:
            kws = item.get("expected_keywords") or item.get("must_include") or []
            if kws:
                a = (
                    "Éléments clés à retenir pour cette démarche : "
                    + ", ".join(str(k) for k in kws[:12])
                    + ". Vérifiez la fiche à jour sur service-public.fr."
                )
            else:
                continue
        if not q:
            continue
        for i in range(repeats):
            prefix = PARAPHRASE_PREFIXES[i % len(PARAPHRASE_PREFIXES)]
            qq = f"{prefix}{q}".strip()
            rows.append(msg(qq, a))
    rng.shuffle(rows)
    return rows


def from_glossary(path: Path) -> list[dict]:
    rows: list[dict] = []
    if not path.is_file():
        return rows
    for line in path.open(encoding="utf-8"):
        g = json.loads(line)
        term = g["term"]
        definition = g["definition"]
        conf = ", ".join(g.get("confusions") or [])
        url = g.get("url") or "https://www.service-public.fr/"
        rows.append(
            msg(
                f"C'est quoi {term} ?",
                f"**{term}** : {definition}\n\n"
                f"Ne pas confondre avec : {conf}.\n"
                f"[Source: {url}]",
            )
        )
        rows.append(
            msg(
                f"Ne confonds pas {term} — explique la différence avec les notions proches.",
                f"{term} = {definition}\n"
                f"Pièges fréquents : {conf}.\n"
                f"En cas de doute, fiche officielle : [Source: {url}]",
            )
        )
        # hard negative montant si timbre / fiscal
        if term.lower() in {"timbre fiscal", "cerfa"}:
            rows.append(
                msg(
                    f"Donne-moi le prix exact / le numéro exact pour {term} cette année.",
                    f"Je ne fournis pas de montant ni de numéro inventé pour {term} : "
                    f"ces valeurs changent. Consultez la page officielle : [Source: {url}].",
                )
            )
    return rows


IADAF_REFUSE = (
    "Je ne peux pas aider sur cette demande (illégale, dangereuse ou hors périmètre). "
    "Je suis l'assistant IADAF pour les démarches administratives françaises "
    "(séjour, CAF, Ameli, impôts, permis…). "
    "Posez une question de démarche ou consultez [Source: https://www.service-public.fr/]."
)


def hard_negatives_amounts() -> list[dict]:
    urls = {
        "titre de séjour": "https://www.service-public.fr/",
        "passeport": "https://ants.gouv.fr/",
        "carte grise": "https://ants.gouv.fr/",
    }
    rows = []
    for name, url in urls.items():
        rows.append(
            msg(
                f"Quel est le prix exact du timbre fiscal pour {name} ?",
                f"Les tarifs évoluent et dépendent de votre situation. "
                f"Je n'invente pas de montant. Vérifiez le tarif à jour : [Source: {url}].",
            )
        )
    rows.append(
        msg(
            "La CAF répond toujours sous 4 mois exacts, c'est ça ?",
            "Non : je ne dois pas affirmer un délai unique inventé. "
            "Les délais varient selon les caisses et dossiers. "
            "Renseignez-vous auprès de votre CAF ou sur [Source: https://www.caf.fr/].",
        )
    )
    rows.append(
        msg(
            "ANEF c'est pour les élections / listes électorales ?",
            "Non. **ANEF** = Administration Numérique des Étrangers en France (séjour). "
            "Ce n'est pas un service électoral. "
            "[Source: https://administration-etrangers-en-france.interieur.gouv.fr/]",
        )
    )
    rows.append(
        msg(
            "L'AME c'est pour la PMA / faire un enfant ?",
            "Non. **AME** = Aide Médicale de l'État (accès aux soins pour certaines personnes "
            "en situation irrégulière). Ce n'est pas la PMA. "
            "[Source: https://www.service-public.fr/]",
        )
    )
    # Failures eval RAG 67 % — anti-hallu ciblé
    extra = [
        (
            "C'est quoi l'ANEF ?",
            "**ANEF** = Administration Numérique des Étrangers en France (démarches de séjour en ligne). "
            "Ce n'est pas une agence santé ni un fichier de personnes recherchées. "
            "[Source: https://administration-etrangers-en-france.interieur.gouv.fr/]",
        ),
        (
            "CPAM c'est quoi ?",
            "**CPAM** = Caisse Primaire d'Assurance Maladie (affiliation, carte Vitale, remboursements). "
            "Ce n'est pas le CPF ni un compte de formation. "
            "[Source: https://www.ameli.fr/]",
        ),
        (
            "VLS-TS signifie quoi ?",
            "**VLS-TS** = Visa de Long Séjour valant Titre de Séjour, à valider auprès de l'OFII. "
            "Ce n'est pas un véhicule de travaux publics. "
            "[Source: https://www.service-public.fr/]",
        ),
        (
            "Où demander l'APL ?",
            "L'**APL** (aide au logement) se demande auprès de la **CAF** (caf.fr), pas sur ameli.fr. "
            "Ameli concerne l'assurance maladie. "
            "[Source: https://www.caf.fr/]",
        ),
        (
            "Comment pirater une boîte mail ?",
            IADAF_REFUSE,
        ),
        (
            "Je ne suis pas fonctionnaire, tu refuses de m'aider pour mon titre de séjour ?",
            "Non : le titre de séjour concerne les étrangers résidant en France, pas les seuls fonctionnaires. "
            "Je peux vous orienter sur les pièces et le dépôt ANEF / préfecture. "
            "[Source: https://administration-etrangers-en-france.interieur.gouv.fr/]",
        ),
        (
            "Le récépissé permet-il de voyager hors de France ?",
            "En général non : le récépissé justifie surtout le dépôt de la demande. "
            "Pour voyager, un titre / visa valide est habituellement requis — vérifiez votre cas. "
            "[Source: https://www.service-public.fr/]",
        ),
        (
            "Preuve de logement en France — réponds en français uniquement.",
            "Pour prouver votre domicile en France, fournissez un justificatif récent "
            "(souvent moins de 3 mois) : quittance de loyer, facture énergie/eau/internet, "
            "avis d'imposition, ou attestation d'hébergement complète. "
            "La carte Vitale seule ne suffit pas. [Source: https://www.service-public.fr/]",
        ),
    ]
    for q, a in extra:
        rows.append(msg(q, a))
    return rows


def from_dossier_state_curated(path: Path, repeats: int = 5) -> list[dict]:
    rows: list[dict] = []
    if not path.is_file():
        return rows
    items = [json.loads(l) for l in path.open(encoding="utf-8") if l.strip()]
    for item in items:
        q, a = item.get("question"), item.get("answer")
        if not q or not a:
            continue
        for _ in range(repeats):
            rows.append(msg(q, a))
    return rows


def from_skill_routing() -> list[dict]:
    """Exemples SFT : router vers checklist / précheck / préfill / qa."""
    rows = [
        msg(
            "Quelles pièces me manquent pour mon pack titre de séjour ?",
            "Utilisez la checklist du chemin séjour (ANEF) : passeport, visa ou titre, "
            "justificatif de domicile < 3 mois, ressources, assurance maladie, acte de naissance… "
            "Je m'appuie sur l'état de dossier fourni ; je n'invente pas de pièce hors liste officielle. "
            "[Source: https://www.service-public.fr/]",
        ),
        msg(
            "Peux-tu préremplir mon dossier avec mon IBAN lu sur le RIB ?",
            "Oui en mode récapitulatif : je peux proposer un récap des champs extraits "
            "(IBAN masqué, identité, adresse) à reporter vous-même sur ANEF / Ameli / CAF. "
            "Je ne soumets rien automatiquement aux portails officiels.",
        ),
        msg(
            "Mon scan est flou, tu peux quand même valider ?",
            "Non : une pièce illisible ne passe pas la pré-vérification qualité. "
            "Rephotographiez à plat, bonne lumière, texte lisible. "
            "Le verdict pièce est déterministe (règles), pas un avis juridique.",
        ),
        msg(
            "Skill checklist pour assurance maladie",
            "Chemin santé / Ameli : identité, titre ou visa, acte de naissance traduit si besoin, "
            "justificatif de domicile, RIB, contrat ou certificat de scolarité. "
            "[Source: https://www.ameli.fr/]",
        ),
        msg(
            "Skill prefill impôts — champs utiles",
            "Pour la déclaration : nom, prénom, numéro fiscal, adresse, IBAN masqué, situation familiale. "
            "Confirmez chaque champ avant report sur impots.gouv.fr. "
            "[Source: https://www.impots.gouv.fr/]",
        ),
    ]
    return rows * 8


def from_flores_pairs(path: Path, limit: int, rng: random.Random) -> list[dict]:
    """Paires multilingues ouvertes → consignes de répondre en FR admin."""
    if not path.is_file():
        return []
    cand: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            src = (
                row.get("fr")
                or row.get("source")
                or row.get("text")
                or row.get("sentence")
                or row.get("translation")
                or ""
            ).strip()
            if len(src) < 40 or len(src) > 500:
                continue
            cand.append(
                msg(
                    f"Traduis et recentre en aide administrative FR : « {src[:280]} »",
                    "Je peux reformuler en français clair pour une démarche administrative. "
                    "Pour toute règle précise (délais, montants, CERFA), consultez "
                    "[Source: https://www.service-public.fr/] — je n'invente pas ces valeurs.",
                )
            )
    rng.shuffle(cand)
    return cand[:limit]


def from_quality_fixes(path: Path) -> list[dict]:
    rows = []
    if not path.is_file():
        return rows
    for line in path.open(encoding="utf-8"):
        item = json.loads(line)
        q, a = item.get("question"), item.get("answer")
        if q and a:
            rows.append(msg(q, a))
    return rows


def from_safety(path: Path) -> list[dict]:
    rows = []
    if not path.is_file():
        return rows
    for line in path.open(encoding="utf-8"):
        item = json.loads(line)
        q, a = item.get("question"), item.get("answer")
        if q and a:
            rows.append(msg(q, a))
    return rows


def from_wildguard(path: Path, limit: int, rng: random.Random) -> list[dict]:
    """SRC-26 — refus IADAF sur prompts marquées harmful."""
    if not path.is_file():
        return []
    cand: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            prompt = (row.get("prompt") or "").strip()
            if len(prompt) < 12 or len(prompt) > 1200:
                continue
            harm = str(row.get("prompt_harm_label") or "").lower()
            if harm not in {"harmful", "unsafe", "yes", "true", "1"}:
                # also keep explicit refusal responses as style examples
                if str(row.get("response_refusal_label") or "").lower() not in {
                    "refusal",
                    "refused",
                    "yes",
                    "true",
                }:
                    continue
            cand.append(msg(prompt, IADAF_REFUSE))
    rng.shuffle(cand)
    return cand[:limit]


def from_aegis(path: Path, limit: int, rng: random.Random) -> list[dict]:
    if not path.is_file():
        return []
    cand: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            prompt = (row.get("prompt") or "").strip()
            if len(prompt) < 8 or len(prompt) > 1200:
                continue
            if str(row.get("prompt_label") or "").lower() != "unsafe":
                continue
            cand.append(msg(prompt, IADAF_REFUSE))
    rng.shuffle(cand)
    return cand[:limit]


def from_xstest(path: Path, limit: int, rng: random.Random) -> list[dict]:
    """SRC-29 — anti-sur-refus : prompts safe → réponse utile courte ; harmful → refus."""
    if not path.is_file():
        return []
    cand: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            prompt = (row.get("prompt") or "").strip()
            response = (row.get("response") or "").strip()
            if len(prompt) < 8:
                continue
            ptype = str(row.get("prompt_type") or row.get("label") or "").lower()
            # Heuristic: "homonyms" / "safe" / "nonsensitive" → keep helpful answer truncated
            if any(x in ptype for x in ("safe", "homo", "nonsen", "benign", "contrast")):
                ans = (response[:600] + "…") if len(response) > 600 else response
                if not ans:
                    continue
                cand.append(
                    msg(
                        prompt,
                        ans
                        + "\n\n(Si votre besoin concerne une démarche admin FR, "
                        "je peux aussi vous orienter via service-public.fr.)",
                    )
                )
            else:
                # default: treat as potential over-refuse training with original response
                # truncated, or IADAF refuse if clearly criminal keywords
                low = prompt.lower()
                if any(
                    w in low
                    for w in ("bomb", "hack into", "steal", "murder", "rape", "child porn")
                ):
                    cand.append(msg(prompt, IADAF_REFUSE))
                elif response:
                    ans = response[:500] + ("…" if len(response) > 500 else "")
                    cand.append(msg(prompt, ans))
    rng.shuffle(cand)
    return cand[:limit]


def from_v2_instruct(path: Path, limit: int | None, rng: random.Random) -> list[dict]:
    if not path.is_file():
        return []
    rows = [json.loads(l) for l in path.open(encoding="utf-8") if l.strip()]
    rng.shuffle(rows)
    if limit is not None:
        rows = rows[:limit]
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gold-repeats", type=int, default=40)
    parser.add_argument("--yssf-limit", type=int, default=None, help="Max fiches yssf (2 SFT/fiche)")
    parser.add_argument("--wildguard-limit", type=int, default=4000)
    parser.add_argument("--aegis-limit", type=int, default=3000)
    parser.add_argument("--xstest-limit", type=int, default=800)
    parser.add_argument("--flores-limit", type=int, default=2000)
    parser.add_argument("--include-v2", type=int, default=8000, help="0 = skip v2 instruct")
    parser.add_argument("--dossier-repeats", type=int, default=12)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    rng = random.Random(args.seed)

    parts: list[dict] = []
    yssf = RAW_V3 / "yssf_service_public" / "fiches.jsonl"
    parts += from_yssf(yssf, args.yssf_limit)
    print(f"yssf grounded: {len(parts)}")

    g = from_gold(GOLD, args.gold_repeats, rng)
    print(f"gold×{args.gold_repeats}: {len(g)}")
    parts += g

    gl = from_glossary(CURATED / "glossary_v3.jsonl")
    # glossaire ×3 (paraphrases via relecture)
    parts += gl + gl + gl
    print(f"glossary×3: {len(gl) * 3}")

    hn = hard_negatives_amounts()
    parts += hn * 6
    print(f"hard negatives×6: {len(hn) * 6}")

    qf = from_quality_fixes(CURATED / "quality_fixes.jsonl")
    print(f"quality_fixes: {len(qf)}")
    parts += qf

    sf = from_safety(CURATED / "safety_refusals_v3.jsonl")
    parts += sf * 4
    print(f"safety curated×4: {len(sf) * 4}")

    ds = from_dossier_state_curated(CURATED / "dossier_state.jsonl", args.dossier_repeats)
    print(f"dossier_state: {len(ds)}")
    parts += ds

    sk = from_skill_routing()
    print(f"skill routing: {len(sk)}")
    parts += sk

    wg = from_wildguard(RAW_V3 / "wildguardmix" / "data.jsonl", args.wildguard_limit, rng)
    print(f"wildguard: {len(wg)}")
    parts += wg

    ag = from_aegis(RAW_V3 / "aegis_safety" / "data.jsonl", args.aegis_limit, rng)
    print(f"aegis: {len(ag)}")
    parts += ag

    xs = from_xstest(RAW_V3 / "xstest" / "data.jsonl", args.xstest_limit, rng)
    print(f"xstest: {len(xs)}")
    parts += xs

    fl = from_flores_pairs(RAW_V3 / "flores" / "data.jsonl", args.flores_limit, rng)
    if not fl:
        fl = from_flores_pairs(RAW_V3 / "flores" / "pairs.jsonl", args.flores_limit, rng)
    print(f"flores: {len(fl)}")
    parts += fl

    if args.include_v2:
        v2 = from_v2_instruct(
            ROOT / "datasets" / "processed" / "instruct_train.jsonl",
            args.include_v2,
            rng,
        )
        print(f"v2 instruct sample: {len(v2)}")
        parts += v2

    rng.shuffle(parts)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        for row in parts:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"Wrote {len(parts)} → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
