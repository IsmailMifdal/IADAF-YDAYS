# AI model selection study

This study proposes a two-phase method to choose the pre-trained model IADAF will use or adapt: a desk decision matrix that turns a wide candidate list into four finalists, then a benchmark of those finalists on the reference test set (ISM-33) before any fine-tuning.

Status: proposal, 2026-11-05, Linear ISM-117. Author: Benoît (backend). Reviewers: the data/AI role of the Users and AI pole (Linear project "Pôle IA & Mobile"; co-signer to be named by Ismail), Corentin, then Ismail, product owner and tech lead, who has the final word. Every weight and score below is a proposal for Ismail to validate: the result can be contested on a weight or a score, never on the conclusion alone.

## 1. What the model must do

The product goal: tell a user whether the file they are about to submit for an administrative procedure is complete, partially complete or incomplete, and explain why in the user's language (UI languages: fr, en, ar, es).

ADR-0001 (ISM-116, PR #153) fixes the division of labour: the rules decide, the model never produces a verdict. The model has three jobs:

| Job | Input | Output | Consumer |
|---|---|---|---|
| J1 Recognise the document type | an uploaded image or PDF | a document kind (passport, residence permit, tax notice, proof of address, bank statement…) | the "type mismatch" rule that ADR-0001 plans (through a `DocumentFacts` record); today the kind comes from the label the user picks (`category()` in `ai-service/app/documents/rules.py`) |
| J2 Extract the facts the rules need | the same document | structured fields: expiry date, issue date, MRZ validity, IBAN presence… | the deterministic checks in `ai-service/app/documents/rules.py` |
| J3 Explain the verdict | the rule-based checks (status `ok`, `warning`, `error` or `unknown` each) | a short explanation in the user's language | the user, through the assistant |

Consequences for the choice:

- J1 and J2 need a model that reads documents (vision), or OCR plus a text model. The service already has an optional OCR adapter (Mistral OCR, disabled by default).
- J3 needs good French and usable Arabic, Spanish and English, and a system/user prompt format. Today `LLMService` sends the whole prompt as one `user` message (`ai-service/app/services/llm_service.py`); ADR-0001 replaces it with a `ChatModel` port taking role-tagged messages. That change is a prerequisite of any fine-tuning dataset.
- Nothing requires the model to know French administrative law: the facts come from the rules and the retrieval index (RAG), and they change. Fine-tuning, if any, targets tone, language, format and extraction reliability, not knowledge.

## 2. Assumptions and scope

Nine inputs were asked of the owner on 2026-11-05. Each unanswered one is an assumption below. Changing an assumption changes a score, not the method.

| # | Input | Answer | Assumption used here |
|---|---|---|---|
| A1 | Calendar and demo date | unknown | intermediate milestone end of February 2027, final delivery May 2027 |
| A2 | Hours per week per contributor | about 8 h | 8 h/week; 4 contributors take part in the AI work, each with their own account on each free service |
| A3 | Pilot procedures (1 to 3) | unknown | residence permit (ANEF, 7 documents in `front/src/app/(app)/packs/packContent.ts`) and housing allowance (CAF, 6 documents, tied with health insurance; the author's tie-break, to be confirmed by Ismail) |
| A4 | Document languages | unknown | mostly French documents; foreign passports and civil-status records in Arabic, Spanish or English are possible |
| A5 | Target public | unknown | newcomers who do not speak French well; the explanation in the user's language matters more than elegance in French |
| A6 | Anonymised real documents allowed | unknown | no real document until the DPIA (ISM-64) is validated: synthetic documents and public specimens only |
| A7 | School budget order of magnitude | unknown | 0 € acquired; the training plan states the triggers that would justify a request |
| A8 | Fine-tuning vs RAG-only validated by Ismail | unknown | not decided: RAG-only on a hosted API is the baseline every finalist and every fine-tuned model must beat |
| A9 | Who co-signs with the data/AI role | unknown | to be named by Ismail |

In scope: the candidate list, the criteria and weights, the desk scores, the benchmark protocol, the judges, the sign-off. Out of scope: building the dataset (ISM-66), the fine-tuning itself (ISM-75, whose title presupposes Mistral and should be re-titled once Phase 2 has a winner), serving (ISM-86), the production choice by score and cost (ISM-98).

## 3. Phase 1: desk study

### 3.1 Candidate list

Open-weight families of several sizes, French and multilingual models, vision-capable models for J1 and J2, and hosted fine-tuning services. Models that no free 16 GB T4 can train with QLoRA (above about 14 B) stay on the list when they are a realistic quality ceiling (C3, C10); larger ones are excluded below with the reason.

| # | Candidate | Params | Licence | Vision | Why it is on the list |
|---|---|---|---|---|---|
| C1 | Ministral 3 8B (Instruct 2512) | 8 B | Apache 2.0 | yes | French vendor, image understanding, 256k context |
| C2 | Ministral 3 14B (Instruct 2512) | 14 B | Apache 2.0 | yes | same family, upper size that still fits a T4 with QLoRA |
| C3 | Mistral Small 3.2 | 24 B | Apache 2.0 | yes | the family's quality ceiling; too large for a T4 |
| C4 | Llama 3.1 8B Instruct | 8 B | Llama community licence | no | the most common fine-tuning target, best tooling |
| C5 | Qwen3 8B | 8 B | Apache 2.0 | no | 119 languages announced |
| C6 | Qwen3 14B | 14 B | Apache 2.0 | no | same family, upper size |
| C7 | Qwen3-VL 8B Instruct | 8 B | Apache 2.0 | yes | document understanding (DocVQA 96.1 reported), OCR in 32 languages |
| C8 | Gemma 3 12B | 12 B | Gemma terms of use | yes | 140 languages, vision |
| C9 | Gemma 4 E4B | about 4.5 B (raw or effective count to confirm on the card) | Apache 2.0 | yes | small, vision, Apache since April 2026 |
| C10 | Gemma 4 26B MoE (A4B) | 26 B total, about 4 B active | Apache 2.0 | yes | large-model quality at small-model inference cost; weights still 26 B |
| C11 | Phi-4-mini | 3.8 B | MIT | no | permissive licence, very small |
| C12 | Phi-4-multimodal | 5.6 B | MIT | yes | same family, image and audio |
| C13 | EuroLLM-9B Instruct | 9 B | Apache 2.0 (reported, to verify) | no | European model, 24 EU languages plus 11 others including Arabic |
| C14 | CroissantLLM | 1.3 B | open (paper), to verify | no | French-English bilingual research model |
| C15 | Mistral fine-tuning API (hosted) | n/a | service terms | depends on base | fine-tuning as a service, EU hosting |
| C16 | Hugging Face AutoTrain / Jobs (hosted) | any | service terms, weights are yours | depends on base | fine-tuning as a service on paid GPUs |
| C17 | OpenAI fine-tuning (hosted) | n/a | service terms | partial | the current API vendor; weights not returned |

Excluded with the reason: Llama 3.2 Vision 11B and Llama 4 (their acceptable-use policy excludes EU-domiciled individuals and companies from the multimodal models); Mistral Large 3, Qwen3 32B and above, Llama 70B (no free T4 offer can train them; only Modal's H100 credits or Jean Zay could, and the training plan does not need them).

### 3.2 Criteria and weights

Seven criteria, weights summing to 100 (profile A, chosen in § 3.3).

| Criterion | Weight | What a 5 means | What a 0 means |
|---|---|---|---|
| K1 French and multilingual quality, Arabic included | 25 | strong French, usable Arabic, Spanish and English at 8 B | French weak or Arabic absent |
| K2 Parameter count vs the free GPU budget (QLoRA on a 16 GB T4) | 20 | 8 B or less, trains in a few hours on a T4 | does not fit a T4 even quantised |
| K3 Licence | 15 | Apache 2.0 or MIT, weights ours | no weights, or terms that exclude the EU |
| K4 Document and vision support (J1, J2) | 15 | native vision with strong document benchmarks | text only |
| K5 Tooling (Unsloth, Transformers, vLLM, Hugging Face Hub) | 10 | supported out of the box by Unsloth and vLLM | custom code needed |
| K6 GDPR and hosting | 10 | the data never leaves an infrastructure we choose: open weights self-hosted anywhere, or an EU-hosted service | US-hosted service, data reused for training by default |
| K7 Serving cost (inference in staging and production) | 5 | runs on a small GPU or a CPU | needs a large GPU or an expensive API |

K6 is applied literally: every open-weight model scores 5, whatever the vendor's nationality, because self-hosted weights send nothing to the vendor. K6 therefore separates open weights from hosted services, not one open model from another.

Why K2 (training fit, 20) weighs more than K7 (serving, 5) although the training plan finds that serving, not training, is the real cost: K2 is a hard feasibility gate for this project (a model we cannot train on free compute leaves ISM-75 without a path), while the serving cost is decided later, by measurement, in ISM-98. The variant "serving at 15" in § 3.5 shows what changes if Ismail disagrees.

### 3.3 Choice of the weighting profile (meta-decision)

Three profiles were compared on 2026-11-05; the backend author picked A; Ismail validates or changes it.

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
| Feasibility within the free compute before May 2027 | 25 | 4 · size at 20 is enough to rank > 14 B low | 5 · size at 30 | 3 · a 24 B model can rank above an 8 B |
| Control of GDPR and licence risk | 20 | 3 · 25 points combined | 2 · 20 points | 5 · 45 points |
| Contestability by the owner (readable weights, few ties) | 10 | 4 | 4 | 4 |
| Alignment with ADR-0001 (the model reads the document, the rules decide: vision weighs) | 10 | 5 · vision 15 | 3 | 3 |
| **Total /500** | 100 | **425** | **340** | **350** |

Sensitivity: with compliance at 35 and fidelity at 20, A 395, B 325, C 380; A stays first. C overtakes A only when the compliance weight exceeds the fidelity weight by more than 22.5 points (at 40 against 15: C 390, A 385). That is the question for Ismail.

### 3.4 Decision matrix (desk estimates, to be confirmed by Phase 2)

Scores 0 to 5 with a one-line reason. Desk estimates from model cards, vendor pages and secondary sources retrieved on 2026-11-05 (§ 8); none is measured on IADAF data. Weights: profile A.

| Candidate | K1 (25) | K2 (20) | K3 (15) | K4 (15) | K5 (10) | K6 (10) | K7 (5) | Total /500 |
|---|---|---|---|---|---|---|---|---|
| C7 Qwen3-VL 8B | 4 · 119 languages, Arabic announced | 5 · 8 B vision model, QLoRA fits a T4 | 5 · Apache 2.0 | 5 · DocVQA 96.1, OCR 32 languages | 4 · Unsloth supports Qwen-VL | 5 · open weights, self-hosted | 3 · image inputs cost more tokens | **455** |
| C1 Ministral 3 8B | 4 · strong French, Arabic reported usable | 5 · 8 B vision model, QLoRA fits a T4 | 5 · Apache 2.0 | 4 · image understanding, not document-specialised | 4 · Transformers and vLLM day one | 5 · open weights, self-hosted | 4 · 8 B on a small GPU | **445** |
| C2 Ministral 3 14B | 5 · best of the family under 24 B | 3 · 12 to 14 GB VRAM, slow on a T4 | 5 · Apache 2.0 | 4 · same encoder as C1 | 4 | 5 | 3 · needs a 24 GB GPU to serve comfortably | **425** |
| C9 Gemma 4 E4B | 3 · 140 languages but about 4.5 B | 5 · smallest vision candidate | 5 · Apache 2.0 | 4 · vision in all sizes | 3 · released April 2026, tooling catching up | 5 | 5 · runs on CPU or any GPU | **415** |
| C10 Gemma 4 26B MoE | 5 · large-model quality | 2 · 26 B of weights do not train on a T4 | 5 | 4 | 3 | 5 | 4 · about 4 B active at inference | **400** |
| C5 Qwen3 8B | 4 · strong multilingual | 5 | 5 | 0 · text only, needs OCR | 5 · first-class in Unsloth and vLLM | 5 | 4 | **395** |
| C12 Phi-4-multimodal | 2 · multilingual weaker, Arabic weak | 5 | 5 · MIT | 4 | 3 · mixture-of-LoRAs is unusual to fine-tune | 5 | 5 | **390** |
| C3 Mistral Small 3.2 24B | 5 | 1 · 4-bit weights alone fill a T4 | 5 | 4 | 4 | 5 | 2 · needs a 48 GB GPU or heavy quantisation | **380** |
| C6 Qwen3 14B | 5 | 3 | 5 | 0 | 5 | 5 | 3 | **375** |
| C16 HF AutoTrain / Jobs | 4 · any base model | 3 · paid GPU hours, free tier uncertain | 5 · weights returned | 4 · depends on base | 4 | 2 · US hosting | 4 | **375** |
| C8 Gemma 3 12B | 4 | 3 | 3 · terms of use, revocable | 4 | 4 | 5 | 3 | **370** |
| C15 Mistral fine-tuning API | 4 · Ministral or Small base | 5 · no GPU to manage | 2 · fine-tuned weights stay hosted | 3 · depends on base and API | 3 · vendor tooling only | 5 · EU hosting, processor contract | 2 · per token plus a monthly storage fee | **365** |
| C13 EuroLLM-9B | 4 · EU languages first, Arabic among the extra 11 | 5 | 4 · Apache reported, not verified on the card | 0 · text only | 3 · 4k context, less tooling | 5 | 4 | **360** |
| C11 Phi-4-mini | 2 | 5 | 5 | 0 | 4 | 5 | 5 | **340** |
| C4 Llama 3.1 8B | 3 · eight official languages, no Arabic | 5 | 2 · community licence, EU exclusion on multimodal, naming duties | 0 | 5 · the best-supported target | 5 | 4 | **325** |
| C17 OpenAI fine-tuning | 5 | 5 | 0 · no weights | 3 | 3 | 1 · US hosting | 2 | **320** |
| C14 CroissantLLM 1.3B | 1 · French-English only, 1.3 B | 5 | 4 | 0 | 2 | 5 | 5 | **280** |

### 3.5 Sensitivity check

| Variant (weights K1 to K7) | C7 | C1 | C2 | C9 | 5th |
|---|---|---|---|---|---|
| Profile A (25 20 15 15 10 10 5) | 455 | 445 | 425 | 415 | C10 400 |
| Vision at 30 (15 15 15 30 10 10 5) | 465 | 440 | 420 | 420 | C12 405 |
| GDPR at 25 (15 15 15 15 10 25 5) | 465 | 455 | 435 | 435 | C12 420 |
| Serving at 15 (25 10 15 15 10 10 15) | 435 | 435 | 425 | 415 | C10 420 (4th; C9 5th) |
| Profile B (20 30 10 10 15 10 5) | 455 | 450 | 405 | 420 | C5 425 (3rd; C2 5th) |
| Profile C (20 15 20 10 5 25 5) | 465 | 460 | 445 | 440 | C10 430 |

Reading: C7 and C1 are first and second under every variant. C2 and C9 hold under A, C and the vision and GDPR variants. Two variants change the fourth finalist: "serving at 15" puts Gemma 4 26B MoE ahead of Gemma 4 E4B, and profile B puts the text-only Qwen3 8B ahead of Ministral 3 14B. Ismail's choice of weights therefore matters only for the third and fourth finalists.

### 3.6 Finalists proposed for Phase 2

Rule: the top four of the matrix under the validated profile. Under profile A they cover three families and three sizes, which lets the benchmark separate the effect of size from the effect of family.

| Finalist | Size | What its result tells us |
|---|---|---|
| F1 Qwen3-VL 8B | 8 B | whether document specialisation wins on J1 and J2 |
| F2 Ministral 3 8B | 8 B | a general vision model of the same size, French vendor |
| F3 Ministral 3 14B | 14 B | whether 14 B beats 8 B enough to pay for slower training |
| F4 Gemma 4 E4B | about 4.5 B | whether a small model is enough, which would cut every cost |

Baselines, always measured alongside, all with RAG and no fine-tuning:

- B0 the current hosted API (`gpt-4o-mini` through `LLMService`), J3 only: `LLMService` sends text only today.
- B0-EU an EU-hosted OpenAI-compatible API (the option `ai-service/app/core/config.py` already documents), so a self-hosted finalist is compared with the GDPR-equivalent hosted option ISM-98 will weigh.
- B1 the current pre-check without any model: J1 is the user's label only (no recognition, so B1 sets the floor, not a bar), J2 is pypdf text plus the optional OCR.

A finalist that does not beat B0 and B0-EU on J3, and B1 on J2, is not worth fine-tuning (A8).

## 4. Phase 2: empirical benchmark

### 4.1 Principle

Measure the four finalists zero-shot, under identical prompts and settings, on the ISM-33 reference set restricted to the pilot procedures (A3), before any fine-tuning. The benchmark answers one question: which base model, as it is, is closest to the job. Fine-tuning (ISM-75) starts from the winner, and the same benchmark then measures what fine-tuning adds.

### 4.2 Test set

The ISM-33 set does not exist yet; this section states what Phase 2 needs from it.

| Item | Requirement |
|---|---|
| Procedures | the pilot ones (A3) |
| Documents | synthetic documents and public specimens only (A6): identity pages with valid and invalid MRZ; identity documents expired, expiring within 90 days and valid; proofs of address issued within and beyond 92 days; bank statements with and without IBAN; tax notices. At least 30 documents per kind, degraded scans and phone photos included |
| Languages | document languages per A4; questions and expected explanations in fr, en, ar, es |
| Size | 300 items minimum: 120 for J1, 120 for J2, 60 for J3 (a set of checks with their statuses `ok`, `warning`, `error`, `unknown`, and the expected explanation) |
| Ground truth | J1 the kind; J2 the fields the rules need, with values; J3 the rule output and a reference explanation written by a human in each language, plus the rubric |
| Split | 60 % open (prompt work), 20 % selection holdout run once at the end of Phase 2, 20 % final holdout locked until fine-tuning (ISM-75) is finished; neither holdout is used to tune prompts, data or hyperparameters |
| Storage | in the repository under a test fixtures folder, no personal data, licence of each specimen recorded |

The windows (90 and 92 days) and the status vocabulary are those of `ai-service/app/documents/rules.py` on 2026-11-05; the test set follows the code if it changes.

### 4.3 Tasks, metrics and pass criterion

| Job | Metric | Why this metric |
|---|---|---|
| J1 recognise | accuracy on the kind, confusion matrix | a single label; exact match is unambiguous |
| J2 extract | per-field exact match for dates and identifiers; F1 over the fields the rules need; "unreadable" counts as correct when the ground truth is unreadable | the rules consume values: a partly right date is wrong |
| J2 safety | **false "compliant" rate**: among the items whose ground truth leads the rules to `warning`, `error` or `unknown`, the share where the extracted facts lead them to `ok`; the prevalence of those items is reported next to it | the DPIA preparation requires this rate before every release (`docs/rgpd/aipd-preparation.md`, "Exactitude") |
| J3 explain | human rubric 1 to 5 on three axes (in the right language, understandable by a newcomer, concise) plus two binary flags per answer: **contradicts the rule output**, **states a fact absent from the input**; LLM-as-judge with the same rubric, calibrated on the human sample | free text: exact match cannot grade it; a contradiction or an invented fact is a defect, not a low grade |
| All | latency per item, VRAM at inference, tokens generated, dtype and quantisation used | feeds K7 and ISM-98 |

Pass criterion proposed (Ismail validates the thresholds): J1 accuracy ≥ 0.90; J2 field F1 ≥ 0.80; false "compliant" rate ≤ 2 %; J3 rubric mean ≥ 3.5; contradiction or invented-fact flag on ≤ 2 % of J3 answers; and better than the baselines as stated in § 3.6.

### 4.4 Choice of the judges (decision matrix)

Options: A human rubric only; B LLM-as-judge only; C exact match and F1 only; D hybrid (exact match and F1 for J1 and J2, human rubric on a sample of J3, LLM-as-judge calibrated on that sample for the rest of J3).

Eliminatory criterion: the judges must cover all three jobs. C cannot grade J3 explanations, so C is out; it stays in the table for the record, and an eliminated option is not totalled.

| Criterion | Weight | A human only | B LLM judge only | C exact match only | D hybrid |
|---|---|---|---|---|---|
| Agreement with human judgement | 30 | 5 · it is the human judgement | 3 · GPT-4-class judges agree with humans about 80 % of the time on chat answers (Zheng et al. 2023); unknown for Arabic explanations | n/a (eliminated) | 4 · human where it matters, calibrated judge elsewhere |
| Coverage of the three jobs | 25 | 5 | 4 · a judge can grade labels but it is overkill | 2 · no J3 | 5 |
| Human time (8 h/week per contributor) | 20 | 1 · 60 explanations × 4 languages × 4 models × 2 graders | 5 | 5 | 3 · one graded sample of 80 items, two graders |
| Reproducibility | 15 | 2 · graders change | 4 · same judge, same prompt, temperature 0, version pinned | 5 | 4 |
| Bias risk (position, verbosity, self-preference) | 10 | 4 | 2 · known biases | 5 | 4 · judge from no finalist or baseline family, random order, length cap |
| **Total /500** | 100 | **365** | **370** | eliminated | **405** |

Sensitivity: D's lead over B is 35 points. Each point moved from "agreement" to "human time" costs D 3 points against B, so B overtakes D once human time weighs more than about 32 (at 35 with agreement at 15: B 400, D 390, A 305). If human time becomes the scarce resource, the first answer is to shrink the human sample of D (it must stay large enough to compute kappa, about 50 items), not to drop human grading. D is the recommendation.

Judge rules for D:

- The judge belongs to no finalist family and no baseline family: not Mistral, Qwen, Gemma or OpenAI. Proposed: a Claude model through an OpenAI-compatible endpoint, version pinned in the report.
- Answers are shown in random order; the rubric caps the useful length so verbosity does not pay.
- The judge's scores on the human sample are reported with Cohen's kappa against the two human graders. If kappa < 0.6, the judge is dropped and the J3 human sample enlarged.
- The judge receives synthetic items only (training plan, G9).

### 4.5 Protocol (runbook for the data/AI role)

1. Freeze the test set version (git tag) and the prompts (one system prompt per job, identical for every finalist, versioned in the repository).
2. Serve each finalist with vLLM on one free GPU session (Kaggle T4 or Modal), **4-bit for every finalist**, dtype recorded. Run a smoke test of 10 items first: the T4 has no bfloat16, and some families overflow in float16; a finalist that fails the smoke test on a T4 is run on a Modal L4 or A10G instead, and the report says so.
3. Run J1, J2, J3 on the open 60 % of the set; one JSON line per item with model, prompt hash, raw output, parsed output, latency.
4. Compute J1 and J2 metrics by script; grade the J3 human sample (two graders, blind to the model); run the LLM judge on all of J3; compute kappa.
5. Run the selection holdout once, at the end, on every finalist. The final holdout stays locked: it is run only after fine-tuning, to measure the gain without bias.
6. Pick the winner on the selection holdout, with a rule fixed before the results: (a) a finalist that misses the pass criterion is out; (b) lowest false "compliant" rate; (c) highest J2 field F1; (d) highest J3 rubric mean; (e) lowest VRAM at inference. A difference under 1 point of percentage or 0.1 of rubric counts as a tie and moves to the next step. If no finalist passes, the RAG-only baseline stays (A8) and fine-tuning is not started.
7. Write the report: one table per job, baselines included, the pass criterion applied, VRAM and latency, cost estimate per 1,000 users for ISM-98.
8. Sign-off: the data/AI role signs the measurement, Ismail signs the choice. The report goes next to this study as the Phase 2 record and replaces the desk scores of § 3.4 with measured ones.

Estimated effort: 4 GPU-hours (4 finalists × about 1 h; baselines use hosted APIs or no model), 12 GPU-hours booked in the training plan for reruns; 25 human hours (building the set excluded, it belongs to ISM-33); about 3 calendar weeks at 8 h/week per contributor once the set is frozen.

## 5. What this study decides and what it does not

| Decided here (once Ismail validates) | Not decided here |
|---|---|
| the criteria, their weights, the candidate list, the finalists | the model itself: Phase 2 decides it |
| the benchmark protocol, the judges, the pass criterion | the dataset for fine-tuning (ISM-66) |
| that RAG-only on a hosted API is the baseline to beat (A8) | the production choice by score and cost (ISM-98) |
| that ISM-75 should be re-titled, for example "Adapt the selected open-weight model by QLoRA fine-tuning" | serving (ISM-86) |

## 6. Follow-ups

- ISM-33: build the test set to § 4.2.
- ISM-75: re-title once Phase 2 has a winner; the `ChatModel` port with role-tagged messages (ADR-0001) is a prerequisite.
- ISM-64: the DPIA items are listed in the training plan, § 6.

## 7. Glossary

LLM-as-judge is defined in [../glossary.md](../glossary.md) too; the definition below restates it for beginners and must not diverge.

The training plan carries the full beginner glossary (its § 7). Terms specific to this document:

- **Zero-shot**: asking the model to do the job with instructions only, no example from our data and no training.
- **Exact match, F1**: exact match counts an answer right only if identical to the expected one; F1 balances the fields found against the fields invented, from 0 to 1.
- **Rubric**: a grading grid with fixed axes and a scale, so two graders grade the same way.
- **LLM-as-judge**: using a language model to grade another model's answers against a rubric.
- **Cohen's kappa**: agreement between two graders corrected for chance; 1 is perfect, 0 is chance.
- **Confusion matrix**: a table of which document kinds were mistaken for which.
- **False "compliant" rate**: how often a wrong extraction makes the rules say a document is fine when it is not; the most harmful error for a user.

## 8. Sources

Retrieved 2026-11-05. "Verified" means read on the vendor's own page or paper; "secondary" means a third-party guide, to be re-checked on the model card before Phase 2.

| Fact used | Source | Status |
|---|---|---|
| Ministral 3 family: 3 B, 8 B, 14 B, image understanding, Apache 2.0, 2512 checkpoints | arXiv 2601.08584 (Ministral 3 technical report); Hugging Face collection `mistralai/ministral-3` | verified (paper), model card not re-read |
| Mistral Small 3.x 24 B, vision since 3.1, Apache 2.0 | Mistral AI release notes; eWEEK on Mistral 3 (2025-12) | secondary |
| Qwen3 dense sizes 0.6 B to 32 B, Apache 2.0, 119 languages | qwenlm.github.io/blog/qwen3 | verified (vendor blog) |
| Qwen3-VL sizes, Apache 2.0, DocVQA 96.1 for 8 B, OCR 32 languages (39 in another summary) | Qwen3-VL technical report summaries; docs.kanaries.net; tinyweights.dev | secondary, benchmark figures unverified |
| Gemma 4 (2026-04-02): E2B, E4B, 26B MoE, 31B dense, Apache 2.0, vision in all sizes, 140 languages | Wikipedia "Gemma (language model)"; testingcatalog.com; aimlapi.com | secondary; E4B parameter count unverified |
| Gemma 3 sizes and Gemma terms of use | same | secondary |
| Llama 3.1 8B community licence; Llama 3.2 Vision and Llama 4 acceptable-use policies exclude EU-domiciled licensees from multimodal models | Hugging Face blog "Llama 3.2"; llama.com FAQ; TechCrunch 2024-09-25 | verified (Meta FAQ), licence text not re-read |
| Phi-4-mini 3.8 B and Phi-4-multimodal 5.6 B under MIT | NVIDIA model card for Phi-4-mini; SiliconANGLE 2025-02-26 | secondary |
| EuroLLM-9B: 9.15 B, 35 languages, open release | arXiv 2506.04079 (EuroLLM-9B technical report) | verified (paper); Apache 2.0 only from bestllmfor.com, unverified |
| CroissantLLM 1.3 B, open licence | arXiv 2402.00786 | verified (paper) |
| Mistral fine-tuning API: free experiment tier since 2024-09; 2026 pricing on quote, a per-job minimum and a monthly storage fee reported | mistral.ai/news/september-24-release; costbench.com | partly verified (free tier announcement), prices unverified |
| LLM-as-judge agreement about 80 % with humans for GPT-4-class judges; position, verbosity and self-enhancement biases | Zheng et al. 2023, arXiv 2306.05685 | verified (paper) |
| Current service: `gpt-4o-mini`, optional Mistral OCR off by default, EU-hosted OpenAI-compatible option documented | `ai-service/app/core/config.py` | verified (repository) |
| Single `user` message prompt | `ai-service/app/services/llm_service.py` | verified (repository) |
| Rule windows (90 and 92 days), status vocabulary, kind derived from the label | `ai-service/app/documents/rules.py` | verified (repository) |
| Documents per pack | `front/src/app/(app)/packs/packContent.ts` | verified (repository) |
