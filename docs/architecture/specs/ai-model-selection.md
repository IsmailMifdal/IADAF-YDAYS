# AI model selection study

Status: proposal, 2026-11-05. Linear ISM-117. Author: backend lead (Benoît). Reviewers: Pôle IA (co-signer to be named by Ismail), Corentin, Ismail (final word).

This study proposes a two-phase method to choose the pre-trained model IADAF will adapt or use: a desk study that ranks a wide candidate list with a weighted decision matrix, then an empirical benchmark on three or four finalists with the reference test set (ISM-33) on the pilot procedures, before any fine-tuning. Every weight and score is a proposal for Ismail to validate; the method is designed so that the result can be contested on a weight or a score, never on the conclusion.

## 1. What the model must do

The product goal: tell a user whether the file they are about to submit for an administrative procedure is complete, partially complete or incomplete, and explain why in the user's language (UI languages: fr, en, ar, es).

ADR-0001 (ISM-116, PR #153) fixes the division of labour: the rules decide, the model never produces a verdict. The model has three jobs:

| Job | Input | Output | Consumer |
|---|---|---|---|
| J1 Recognise the document type | an uploaded image or PDF | a document kind (passport, residence permit, tax notice, proof of address, bank statement…) | the "type mismatch" rule |
| J2 Extract the facts the rules need | the same document | structured fields (names of fields only, no values stored: expiry date, issue date, MRZ validity, IBAN presence…) | the deterministic rules in `ai-service/app/documents/rules.py` |
| J3 Explain the verdict | the rule-based verdict and the list of checks | a short explanation in the user's language | the user, through the assistant |

Consequences for the choice:

- J1 and J2 need a model that reads documents (vision, or OCR plus text). A text-only model needs a separate OCR step, which the service already has as an optional adapter (Mistral OCR, disabled by default).
- J3 needs good French and acceptable Arabic, Spanish and English, and a system/user prompt format (the audit of 2026-11-05 flagged that the service sends the whole prompt as one `user` message; this must be fixed before any fine-tuning dataset is built).
- Nothing requires the model to know French administrative law: the facts come from the rules and the retrieval index (RAG), and they change. Fine-tuning, if any, targets tone, language, format and extraction reliability, not knowledge.

## 2. Assumptions and scope

Nine inputs were asked of the owner on 2026-11-05. Each unanswered one is an assumption below, written into this document rather than left as a blocker. Changing an assumption changes a score, not the method.

| # | Input | Answer | Assumption used here |
|---|---|---|---|
| A1 | Calendar and demo date | unknown | intermediate milestone end of February 2027 (benchmark done), final delivery May 2027 |
| A2 | Hours per week per contributor | about 8 h | 8 h/week, 4 contributors (one account each on each free service) |
| A3 | Pilot procedures (1 to 3) | unknown | residence permit (ANEF) and housing allowance (CAF), the two most documented packs in `front/src/app/(app)/packs/packsData.ts` |
| A4 | Document languages | unknown | mostly French documents; foreign passports and civil-status records in Arabic, Spanish or English are possible |
| A5 | Target public | unknown | newcomers who do not speak French well; the explanation in the user's language matters more than elegance in French |
| A6 | Anonymised real documents allowed | unknown | no real document until the DPIA (ISM-64) is validated: synthetic documents and public specimens only |
| A7 | School budget order of magnitude | unknown | 0 € acquired; the training plan states the triggers that would justify a request |
| A8 | Fine-tuning vs RAG-only validated by Ismail | unknown | not decided: RAG-only with the current API is the baseline every finalist and every fine-tuned model must beat on the benchmark |
| A9 | Who co-signs with the Pôle IA | unknown | to be named by Ismail; this document lists the reviewers it needs |

In scope: the candidate list, the criteria and weights, the desk scores, the benchmark protocol, the judges, the sign-off. Out of scope: building the dataset (ISM-66), the fine-tuning itself (ISM-75, to be re-titled once the model is chosen since its title presupposes Mistral), serving (ISM-86), the production choice by score and cost (ISM-98).

## 3. Phase 1: desk study

### 3.1 Candidate list

Open-weight families of several sizes, French and multilingual models, vision-capable models for J1 and J2, and hosted fine-tuning services. Sizes above 24 B parameters are listed only to record why they are excluded: the free compute budget is a 16 GB T4 with QLoRA (see the training plan).

| # | Candidate | Params | Licence | Vision | Why it is on the list |
|---|---|---|---|---|---|
| C1 | Ministral 3 8B (Instruct 2512) | 8 B | Apache 2.0 | yes | French vendor, image understanding, 256k context |
| C2 | Ministral 3 14B (Instruct 2512) | 14 B | Apache 2.0 | yes | same family, upper size that still fits a T4 with QLoRA |
| C3 | Mistral Small 3.2 | 24 B | Apache 2.0 | yes | the family's best quality; too large for a T4 |
| C4 | Llama 3.1 8B Instruct | 8 B | Llama community licence | no | the most common fine-tuning target, best tooling |
| C5 | Qwen3 8B | 8 B | Apache 2.0 | no | 119 languages announced, strong Arabic |
| C6 | Qwen3 14B | 14 B | Apache 2.0 | no | same family, upper size |
| C7 | Qwen3-VL 8B Instruct | 8 B | Apache 2.0 | yes | document understanding (DocVQA 96.1 reported), OCR in 32 languages |
| C8 | Gemma 3 12B | 12 B | Gemma terms of use | yes | 140 languages, vision |
| C9 | Gemma 4 E4B | about 4.5 B | Apache 2.0 | yes | small, vision, Apache since April 2026 |
| C10 | Gemma 4 26B MoE (A4B) | 26 B total, 4 B active | Apache 2.0 | yes | quality of a large model with the compute of a small one at inference; weights still 26 B |
| C11 | Phi-4-mini | 3.8 B | MIT | no | permissive licence, very small |
| C12 | Phi-4-multimodal | 5.6 B | MIT | yes | same family, image and audio |
| C13 | EuroLLM-9B Instruct | 9 B | Apache 2.0 (reported, to verify) | no | European model, 24 EU languages plus 11 others including Arabic |
| C14 | CroissantLLM | 1.3 B | open (paper), to verify | no | French-English bilingual research model |
| C15 | Mistral fine-tuning API (hosted) | n/a | service terms | depends on base | fine-tuning as a service, EU hosting |
| C16 | Hugging Face AutoTrain / Jobs (hosted) | any | service terms, weights are yours | depends on base | fine-tuning as a service on paid GPUs |
| C17 | OpenAI fine-tuning (hosted) | n/a | service terms | partial | the current API vendor; weights not returned |

Not listed on purpose: Llama 3.2 Vision 11B and Llama 4 (their acceptable-use policy excludes EU-domiciled individuals and companies from the multimodal models), Mistral Large 3, Qwen3 32B and above, Llama 70B (no free compute can train them).

### 3.2 Criteria and weights

Seven criteria. The weights sum to 100. The weights were chosen with a decision matrix of their own (§ 3.3) so that Ismail can contest the weighting profile, not only a weight.

| Criterion | Weight | What a 5 means | What a 0 means |
|---|---|---|---|
| K1 French and multilingual quality, Arabic included | 25 | strong French, usable Arabic, Spanish and English at 8 B | French weak or Arabic absent |
| K2 Parameter count vs the free GPU budget (QLoRA on a 16 GB T4) | 20 | 8 B or less, trains in a few hours on a T4 | does not fit a T4 even quantised |
| K3 Licence | 15 | Apache 2.0 or MIT, weights ours | no weights, or terms that exclude the EU |
| K4 Document and vision support (J1, J2) | 15 | native vision with strong document benchmarks | text only |
| K5 Tooling (Unsloth, Transformers, vLLM, Hugging Face Hub) | 10 | supported out of the box by Unsloth and vLLM | custom code needed |
| K6 GDPR and hosting | 10 | EU vendor or self-hostable anywhere, no data leaves the EU | US-hosted service, data used for training by default |
| K7 Serving cost (inference in staging and production) | 5 | runs on a small GPU or CPU, or cheap per token | needs a large GPU or an expensive API |

### 3.3 Choice of the weighting profile (meta-decision)

Three profiles were compared on 2026-11-05 and the backend lead picked A; Ismail validates or changes it.

| Criterion | A · Product first | B · Compute first | C · Compliance first |
|---|---|---|---|
| K1 quality | 25 | 20 | 20 |
| K2 size vs budget | 20 | 30 | 15 |
| K3 licence | 15 | 10 | 20 |
| K4 vision | 15 | 10 | 10 |
| K5 tooling | 10 | 15 | 5 |
| K6 GDPR | 10 | 10 | 25 |
| K7 serving cost | 5 | 5 | 5 |

| Meta-criterion | Weight | A | B | C |
|---|---|---|---|---|
| Fidelity to the product need (recognise, extract, explain in 4 languages) | 35 | 5 · quality plus vision weigh 40 | 3 · 30, compute dominates | 3 · 30 |
| Feasibility within the free compute before May 2027 | 25 | 4 · size at 20 is enough to exclude > 14 B | 5 · size at 30 | 3 · a 24 B model can rank above an 8 B |
| Control of GDPR and licence risk | 20 | 3 · 25 points combined | 2 · 20 points | 5 · 45 points |
| Contestability by the owner (readable weights, few ties) | 10 | 4 | 4 | 4 |
| Alignment with ADR-0001 (the model reads the document, the rules decide: vision weighs) | 10 | 5 · vision 15 | 3 | 3 |
| **Total /500** | 100 | **425** | **340** | **350** |

Sensitivity: with compliance at 35 and fidelity at 20, A 395, B 325, C 380. A stays first; C overtakes only if the owner judges GDPR more important than the product need. That is the question for Ismail.

### 3.4 Decision matrix (desk estimates, to be confirmed by Phase 2)

Scores 0 to 5, one-line reason each. These are desk estimates from vendor documentation, model cards and secondary sources retrieved on 2026-11-05 (§ 8); none has been measured on IADAF data. Column weights are profile A.

| Candidate | K1 (25) | K2 (20) | K3 (15) | K4 (15) | K5 (10) | K6 (10) | K7 (5) | Total /500 |
|---|---|---|---|---|---|---|---|---|
| C1 Ministral 3 8B | 4 · strong French, Arabic reported usable | 5 · 8 B QLoRA fits a T4 | 5 · Apache 2.0 | 4 · image understanding, not document-specialised | 4 · Transformers and vLLM day one, Unsloth soon after | 4 · French vendor, self-hostable | 4 · 8 B on a small GPU | **435** |
| C2 Ministral 3 14B | 5 · best of the family under 24 B | 3 · 12 to 14 GB VRAM, slow on a T4 | 5 · Apache 2.0 | 4 · same encoder as C1 | 4 | 4 | 3 · needs a 24 GB GPU to serve comfortably | **415** |
| C7 Qwen3-VL 8B | 4 · 119 languages, good Arabic | 4 · vision model, heavier than text 8 B | 5 · Apache 2.0 | 5 · DocVQA 96.1, OCR 32 languages | 4 · Unsloth supports Qwen-VL | 3 · Chinese vendor, self-hostable, no EU presence | 3 · vision inference costs more | **415** |
| C9 Gemma 4 E4B | 3 · 140 languages but 4.5 B | 5 · smallest vision candidate | 5 · Apache 2.0 | 4 · vision in all sizes | 3 · released April 2026, tooling still catching up | 3 · US vendor, self-hostable | 5 · runs on CPU or any GPU | **395** |
| C10 Gemma 4 26B MoE | 5 · large-model quality | 2 · 26 B weights do not train on a T4 | 5 | 4 | 3 | 3 | 4 · 4 B active at inference | **380** |
| C5 Qwen3 8B | 4 · strong multilingual | 5 | 5 | 0 · text only, needs OCR | 5 · first-class in Unsloth and vLLM | 3 | 4 | **375** |
| C16 HF AutoTrain / Jobs | 4 · any base model | 3 · paid GPU hours, free tier uncertain | 5 · weights returned | 4 · depends on base | 4 | 2 · US hosting | 4 | **375** |
| C3 Mistral Small 3.2 24B | 5 | 1 · 4-bit weights alone fill a T4 | 5 | 4 | 4 | 4 | 2 · 24 B needs a 48 GB GPU or heavy quantisation | **370** |
| C12 Phi-4-multimodal | 2 · multilingual weaker, Arabic weak | 5 | 5 · MIT | 4 | 3 · mixture-of-LoRAs is unusual for fine-tuning | 3 | 5 | **370** |
| C13 EuroLLM-9B | 4 · EU languages first, Arabic among the extra 11 | 5 | 4 · Apache reported, not verified on the card | 0 · text only | 3 · 4k context, less tooling | 5 · EU-made, EU-trained | 4 | **360** |
| C6 Qwen3 14B | 5 | 3 | 5 | 0 | 5 | 3 | 3 | **355** |
| C15 Mistral fine-tuning API | 4 · Ministral or Small base | 5 · no GPU to manage | 2 · fine-tuned weights stay hosted | 3 · depends on base and API | 3 · vendor tooling only | 4 · EU hosting, processor contract | 2 · per-token plus monthly storage fee | **355** |
| C8 Gemma 3 12B | 4 | 3 | 3 · terms of use, revocable | 4 | 4 | 3 | 3 | **350** |
| C11 Phi-4-mini | 2 | 5 | 5 | 0 | 4 | 3 | 5 | **320** |
| C17 OpenAI fine-tuning | 5 | 5 | 0 · no weights | 3 | 3 | 1 · US hosting, outside the ChatModel self-hosting path | 2 | **320** |
| C4 Llama 3.1 8B | 3 · eight official languages, no Arabic | 5 | 2 · community licence, EU exclusion on multimodal, naming duties | 0 | 5 · the best-supported target | 3 | 4 | **305** |
| C14 CroissantLLM 1.3B | 1 · French-English only, 1.3 B | 5 | 4 | 0 | 2 | 5 | 5 | **280** |

### 3.5 Sensitivity check

| Variant | C1 | C2 | C7 | C9 | next best |
|---|---|---|---|---|---|
| Profile A (reference) | 435 | 415 | 415 | 395 | C10 380 |
| Vision at 30 (K1 15, K2 15) | 430 | 410 | 430 | 400 | C10 380 |
| GDPR at 25 (K1 15, K2 15) | 430 | 410 | 400 | 385 | C13 370 |
| Profile C (compliance first) | 435 | 420 | 400 | 390 | C13 395 |

Under profile A and its two one-weight variants the four finalists are the same: Ministral 3 8B, Ministral 3 14B, Qwen3-VL 8B, Gemma 4 E4B. Only their order changes, and a reordering of desk estimates is exactly what Phase 2 measures. Under profile C, EuroLLM-9B (395) overtakes Gemma 4 E4B (390): if Ismail chooses compliance first, F4 becomes EuroLLM-9B plus the existing OCR adapter, and the benchmark then also measures the cost of a text-only pipeline. The three first finalists hold under every variant.

### 3.6 Finalists proposed for Phase 2

Rule: the top four of the matrix. They happen to cover three families and two sizes, which is what the benchmark needs to separate the effect of size from the effect of family.

| Finalist | Size | What its result tells us |
|---|---|---|
| F1 Ministral 3 8B | 8 B | the reference: fits a T4, French vendor, Apache |
| F2 Ministral 3 14B | 14 B | whether 14 B beats 8 B enough to pay the slower training |
| F3 Qwen3-VL 8B | 8 B | whether document specialisation beats general vision on J1 and J2 |
| F4 Gemma 4 E4B | 4.5 B | whether a 4.5 B model is enough, which would halve every cost |

Baselines, always measured alongside: B0 the current API (`gpt-4o-mini` behind the OpenAI-compatible `ChatModel`, RAG only) and B1 the current rule-based pre-check without any model (J1 and J2 through pypdf and the optional OCR). A finalist that does not beat B0 on J3 and B1 on J1 and J2 is not worth fine-tuning (assumption A8).

## 4. Phase 2: empirical benchmark

### 4.1 Principle

Measure the four finalists zero-shot, under identical prompts and settings, on the reference test set of ISM-33 restricted to the pilot procedures (A3), before any fine-tuning. The benchmark answers one question: which base model, as it is, is closest to the job. Fine-tuning (ISM-75) starts from the winner, and the same benchmark then measures what fine-tuning adds.

### 4.2 Test set

The ISM-33 set does not exist yet; this section states what Phase 2 needs from it so that ISM-33 can be built accordingly.

| Item | Requirement |
|---|---|
| Procedures | the pilot ones (A3: residence permit, housing allowance) |
| Documents | synthetic documents and public specimens only (A6): generated identity pages with valid and invalid MRZ, proofs of address with dates inside and outside the 3- and 6-month windows, bank statements with and without IBAN, tax notices; at least 30 documents per kind, including degraded scans and photos |
| Languages | document languages per A4; questions and expected explanations in fr, en, ar, es |
| Size | 300 items minimum: 120 for J1, 120 for J2, 60 verdict-plus-explanation cases for J3 (a verdict is a status per check: ok, expired, unverifiable, missing) |
| Ground truth | for J1 the kind; for J2 the fields the rules need, with values; for J3 the rule-based verdict and a reference explanation written by a human in each language, plus a rubric |
| Split | 20 % kept blind until the final report, never used to tune prompts |
| Storage | in the repository under a test fixtures folder, no personal data, licence of each specimen recorded |

### 4.3 Tasks and metrics

| Job | Metric | Why this metric |
|---|---|---|
| J1 recognise | accuracy on the kind, plus a confusion matrix | a single label; exact match is unambiguous |
| J2 extract | per-field exact match for dates and identifiers, F1 over the set of fields the rules need; "unverifiable" counts as correct when the ground truth is unreadable | the rules consume values, a partially right date is wrong |
| J3 explain | human rubric 1 to 5 on four axes (faithful to the verdict, in the right language, understandable by a newcomer, no invented fact); LLM-as-judge with the same rubric, calibrated on the human sample | the explanation is free text; exact match cannot grade it |
| All | latency per item on the benchmark GPU, VRAM at inference, tokens generated | feeds K7 and ISM-98 |

Pass criterion proposed: a finalist is eligible for fine-tuning if J1 accuracy ≥ 0.90, J2 field F1 ≥ 0.80, J3 human mean ≥ 3.5 with no "invented fact" below 4 on average, and it beats baselines B0 and B1 on its respective jobs. Ismail validates the thresholds.

### 4.4 Choice of the judges (decision matrix)

Options: A human rubric only; B LLM-as-judge only; C exact match and F1 only; D hybrid (exact match and F1 for J1 and J2, human rubric on a sample for J3, LLM-as-judge calibrated on that sample for the rest of J3).

| Criterion | Weight | A human only | B LLM judge only | C exact match only | D hybrid |
|---|---|---|---|---|---|
| Agreement with human judgement | 30 | 5 · it is the human judgement | 3 · GPT-4-class judges reach about 80 % agreement with humans on chat answers (Zheng et al. 2023); unknown for Arabic explanations | 4 · exact for J1 and J2, undefined for J3 | 4 · human where it matters, calibrated judge elsewhere |
| Coverage of the three jobs | 25 | 5 | 4 · a judge can grade labels but it is overkill | 2 · cannot grade explanations | 5 |
| Human time (8 h/week per contributor) | 20 | 1 · 60 explanations × 4 languages × 4 models × 2 graders | 5 | 5 | 3 · one graded sample of 80 items, two graders |
| Reproducibility | 15 | 2 · graders change | 4 · same judge, same prompt, temperature 0; judge version pinned | 5 | 4 |
| Bias risk (position, verbosity, self-preference) | 10 | 4 | 2 · known biases, and the judge may share a family with a finalist | 5 | 4 · judge from no finalist family, randomised order, length-controlled rubric |
| **Total /500** | 100 | **365** | **370** | **395** | **405** |

Sensitivity: with human time at 35 and agreement at 15, A 305, B 400, C 410, D 390. C overtakes D only because it ignores J3; if human time becomes the scarce resource, the answer is to shrink the J3 human sample, not to drop it. D is the recommendation.

Judge rules for D: the judge model is not from a finalist's family (for the four finalists above, that excludes Mistral, Qwen and Gemma: use the current API model or Claude through the existing OpenAI-compatible port), its version is pinned in the report, answers are shown in random order, the rubric fixes a maximum length so verbosity does not pay, and the judge's scores on the human sample are reported with Cohen's kappa against the two human graders. If kappa < 0.6 the judge is dropped and the J3 human sample is enlarged.

### 4.5 Protocol (runbook for the Pôle IA)

1. Freeze the test set version (git tag) and the prompts (one system prompt per job, same for every finalist, in the repository).
2. Serve each finalist with vLLM on one free GPU session (Kaggle T4 or Modal), 4-bit or 8-bit quantisation recorded; the same quantisation for every finalist at the same size.
3. Run J1, J2, J3 on the public 80 % of the set; one JSON line per item with model, prompt hash, raw output, parsed output, latency.
4. Compute J1 and J2 metrics by script; grade the J3 human sample (two graders, blind to the model); run the LLM judge on all of J3; compute kappa.
5. Run the blind 20 % once, at the end, on every finalist.
6. Write the report: one table per job, baselines included, the pass criterion applied, VRAM and latency, cost estimate per 1,000 users from ISM-98's formula.
7. Sign-off: the Pôle IA signs the measurement, Ismail signs the choice. The report goes into `docs/architecture/` next to this study as the Phase 2 record and updates the matrix of § 3.4 with measured scores.

Estimated effort: 5 GPU-hours (4 finalists plus 2 baselines on about 300 items), 25 human hours (set preparation excluded, it belongs to ISM-33), 2 weeks of calendar time at 8 h/week per contributor.

## 5. What this study decides and what it does not

| Decided here (once Ismail validates) | Not decided here |
|---|---|
| the criteria, their weights, the candidate list, the finalists | the model itself: Phase 2 decides it |
| the benchmark protocol, the judges, the pass criterion | the dataset for fine-tuning (ISM-66) |
| that RAG-only on the current API is the baseline to beat (A8) | the production choice by score and cost (ISM-98) |
| that ISM-75 must be re-titled: "Adapt the selected open-weight model by QLoRA fine-tuning" | serving (ISM-86) |

## 6. Follow-ups

- ISM-33: build the test set to § 4.2.
- ISM-75: re-title once Phase 2 has a winner; the audit's S3 finding (single `user` message) is a prerequisite.
- ISM-64: the DPIA items are listed in the training plan, § 6.
- After PR #153 merges: add this spec and the training plan to the `docs/architecture/README.md` index and the glossary rows (QLoRA, benchmark, LLM-as-judge) to `docs/architecture/glossary.md`.

## 7. Glossary

The training plan carries the full beginner glossary (§ 7 there). Terms specific to this document:

- **Zero-shot**: asking the model to do the job with instructions only, no example from our data and no training.
- **Exact match, F1**: exact match counts an answer right only if identical to the expected one; F1 balances the fields found against the fields invented, from 0 to 1.
- **Rubric**: a grading grid with fixed axes and a scale, so two graders grade the same way.
- **LLM-as-judge**: using a language model to grade another model's answers against a rubric.
- **Cohen's kappa**: agreement between two graders corrected for chance; 1 is perfect, 0 is chance.
- **Confusion matrix**: a table of which kinds were mistaken for which.

## 8. Sources

Retrieved 2026-11-05. "Verified" means read on the vendor's own page or paper; "secondary" means a third-party guide, to be re-checked on the model card before Phase 2.

| Fact used | Source | Status |
|---|---|---|
| Ministral 3 family: 3 B, 8 B, 14 B, image understanding, Apache 2.0, 2512 checkpoints | arXiv 2601.08584 (Mistral AI, Ministral 3 technical report); Hugging Face collection `mistralai/ministral-3` | verified (paper), model card not re-read |
| Mistral Small 3.x 24 B, vision since 3.1, Apache 2.0 | Mistral AI release notes; eWEEK on Mistral 3 (2025-12) | secondary |
| Qwen3 dense sizes 0.6 B to 32 B, Apache 2.0, 119 languages | qwenlm.github.io/blog/qwen3 | verified (vendor blog) |
| Qwen3-VL sizes, Apache 2.0, DocVQA 96.1 for 8 B, OCR 32 languages | Qwen3-VL technical report summaries; docs.kanaries.net; tinyweights.dev | secondary, benchmark figures unverified |
| Gemma 4 (2026-04-02): E2B, E4B, 26B MoE, 31B dense, Apache 2.0, vision in all sizes, 140 languages | Wikipedia "Gemma (language model)"; testingcatalog.com; aimlapi.com | secondary |
| Gemma 3 sizes and Gemma terms of use | same | secondary |
| Llama 3.1 8B, community licence; Llama 3.2 Vision and Llama 4 AUP exclude EU-domiciled licensees from multimodal models | Hugging Face blog "Llama 3.2"; llama.com FAQ; TechCrunch 2024-09-25 | verified (Meta FAQ), licence text not re-read |
| Phi-4-mini 3.8 B and Phi-4-multimodal 5.6 B under MIT | NVIDIA model card for Phi-4-mini; SiliconANGLE 2025-02-26 | secondary |
| EuroLLM-9B: 9.15 B, 35 languages, open release | arXiv 2506.04079 (EuroLLM-9B technical report) | verified (paper); Apache 2.0 only from bestllmfor.com, unverified |
| CroissantLLM 1.3 B, open licence | arXiv 2402.00786 | verified (paper) |
| Mistral fine-tuning API: free experiment tier since 2024-09, 2026 pricing custom, reported 4 $ minimum per job and 2 $/month storage | mistral.ai/news/september-24-release; costbench.com | partly verified (free tier announcement), prices unverified |
| LLM-as-judge agreement about 80 % with humans, position and verbosity biases | Zheng et al. 2023, arXiv 2306.05685 | verified (paper) |
| Current service configuration (`gpt-4o-mini`, optional Mistral OCR, single `user` message) | `ai-service/app/core/config.py`, architecture audit of 2026-11-05 | verified (repository) |
