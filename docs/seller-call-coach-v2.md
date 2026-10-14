# Seller Call Coach: V2 investigation only

V1 has no recording, audio capture, transcription, uploaded transcript, background coaching or permanent deal storage. Do not ship dormant capture code with it.

The recommended direction is an explicitly started and stopped, ephemeral transcription session, initially limited to a supported browser and one audio source. Prefer on-device processing where quality and hardware allow. Otherwise use a server-mediated streaming transcription connection with short-lived scoped authorization; never expose a reusable provider key. Keep a bounded in-memory transcript buffer, no audio retention, and clear buffers on stop, disconnect or expiry. Send only a compact working summary to the acquisition coach at deliberate checkpoints. Keep manual notes and manual coaching available.

Before implementation, resolve:

- Consent: which participants and jurisdictions require notice or consent, how the user establishes it, clear visible recording/transcription indicators, stop controls, revocation, and whether legal review supports the proposed UX. A warning alone is not evidence of consent.
- Capture: browser/platform support for microphone versus system/tab audio, source mixing, headphones, echo cancellation, diarization, permissions and what happens when screen sharing stops. Begin with a constrained support matrix.
- Privacy: whether confidential or personal information can be processed at all, new Terms/Privacy and contractual requirements, provider retention and abuse-monitoring behavior, regional processing, subprocessors, logging/crash reporting, disconnect cleanup, and actual no-retention guarantees. V1 permissions do not authorize a future confidential-data workflow.
- Security: authenticated entitlement checks on connection and reconnection, CSRF/origin checks, token scope and expiry, websocket authorization, idle/max session duration, memory and rate limits, transcript prompt injection and safe rendering.
- Quality: interim versus final transcript handling, correction/duplication, latency, accents, accounting terms and numbers, uncertainty display and preventing advice based on partial or misheard statements. Keep verbal statements explicitly unverified.
- Cost: a separate approved cost/minute model, hard per-session and per-account time/token limits, visible elapsed time and spend guardrails, cancellation when capture stops, reconnect deduplication and no unlimited automatic model turns. Do not silently change V1's 100-request subscription economics.
- Verification: test denied/revoked consent, dropped streams, provider failure, noisy calls, mixed jurisdictions, audio retention, buffer expiry, analytics exclusion and sensitive-data diagnostics before any pilot.

No V2 code, new corpus, provider provisioning or production setting is part of this release.
