# Third-party notices

- WebLLM 0.2.85, MLC AI contributors. Apache-2.0. Official source: https://github.com/mlc-ai/web-llm . License text: dist/vendor/LICENSE-WebLLM.txt.
- Vendored distribution retrieved from https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm on 2026-09-19. jsDelivr bundled dependencies. Adaptation: replace the single ESM export with window.ContextWebLLM inside an IIFE; remove source-map reference. No inference algorithm changes to vendor code.
- The upstream bundled runtime includes MLC/TVM/tokenizer/grammar support. Preserve license comments in the vendored file and the Apache license.
- loglevel (Tim Perry), MIT. https://github.com/pimterry/loglevel . License and copyright notice included at dist/vendor/LICENSE-loglevel.txt.
- Qwen2.5-1.5B-Instruct and Qwen2.5-0.5B-Instruct: Apache-2.0 model families. Model cards: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct and https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct . MLC conversions downloaded on user request from https://huggingface.co/mlc-ai . No weights are included in this ZIP.
- Downloaded model artifacts and browser caches retain their respective upstream terms. The UI uses system fonts; it does not fetch Google Fonts.
