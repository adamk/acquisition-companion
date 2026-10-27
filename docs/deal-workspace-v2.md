# Deal Workspace V2: private-document design boundary

Status: design note only. V1 does not implement private uploads, document storage, transcript ingestion, OCR, audio, recording, external-drive integration, or a confidential deal room. This note does not authorize implementation, procurement, deployment, or corpus publication.

The possible next product is an evidence workspace with repeatable acquisition workflows. The conceptual inspiration associated with Oscar is organizing evidence and repeating useful workflows; there is no affiliation, endorsement, copied skill, copied prompt, or claim to reproduce another product. Acquisition Companion's authored curriculum must remain separate from private deal material.

Potential scope includes private PDFs, spreadsheets, financial statements and CIMs in secure per-deal storage; document-level access controls; financial extraction and reconciliation; exact evidence citations and source-linked findings; and detection of contradictory evidence. These are future candidates, not dormant V1 functionality.

Before development, a new privacy, security, and legal review must approve a concrete design and threat model. A proposal must resolve:

- **Access and isolation:** authenticated owner and collaborator roles; least privilege; authorization on every metadata, object, search, export, and deletion operation; tenant isolation tests; revocation and shared-device behavior; invitation and accidental-sharing risks. Opaque identifiers alone do not provide authorization.
- **Storage and encryption:** data residency, private object storage, transport and at-rest encryption, key management, signed-link lifetime, backups, disaster recovery, administrative access and auditability. Define whether any stronger encryption promise is technically supportable before making it.
- **Retention and deletion:** explicit retention by object class; user and account deletion; derived text, chunks, embeddings, caches, logs, provider copies and backup expiry; deletion receipts, retries and legal holds. Avoid promising instant erasure of independent provider records.
- **Uploads and extraction:** allowed formats, byte/page limits, MIME validation, malware scanning, quarantine, extraction isolation, parser patching, unsupported/password-protected files and rejection flows. Treat documents and retrieved text as untrusted data, including prompt injection and malicious links.
- **Provider processing:** approved processors, contracts, provider retention, model-training terms, subprocessors, routing, failure behavior and whether sensitive material is permitted. Provider requests need explicit scope and user-visible content boundaries.
- **Evidence and provenance:** document version, exact source location, user-provided versus verified status, extraction uncertainty, conflicting evidence, source deletion and stale-result handling. An AI summary must not silently become a verified fact or answer an unanswered question.
- **Cost and abuse:** bounded storage, extraction, retrieval and model budgets; rate limits, quota accounting, cancellation, idempotency, denial-of-wallet protection and transparent customer limits. Reuse billing only after evaluating the actual economics; do not assume the V1 allowance covers uploads.
- **UX and governance:** informed upload consent, permitted-information rules, collaboration consent, local versus server state, export, accessibility, support procedures, incident response and an auditable change process. Do not place document contents in analytics, diagnostics, URLs or the public curriculum.

A future implementation requires a separately approved specification, migration and rollback approach, test evidence for access isolation and deletion, and review of product wording. V1's browser-local saves are not a substitute for these controls and must not be marketed as a secure data room.
