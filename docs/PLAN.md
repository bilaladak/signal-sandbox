# Signal Sandbox — Master Project Plan

> Yatırım senaryo simülasyonu ve karar destek platformu.
> **NOT:** Bu tavsiye platformu değildir. "Ne yapmalısın" değil, "ne olabilir ve neden" sorusuna cevap verir.

---

## Sprint Durumu

| Sprint | Kapsam | Durum |
|--------|--------|-------|
| Sprint 1 | Monorepo, Auth, DB, CI | ✅ Tamamlandı |
| Sprint 2 | Data Layer (Events, Sources, Assets, Watchlists, Queue, Graph, LLM) | ✅ Tamamlandı |
| Sprint 3 | Event Processing Pipelines | 🔄 Sıradaki |
| Sprint 4 | Knowledge Graph + Agent Simulation | ⏳ Bekliyor |
| Sprint 5 | Scenario Engine | ⏳ Bekliyor |
| Sprint 6 | Reports + Daily Briefing | ⏳ Bekliyor |
| Sprint 7 | Portfolio Module | ⏳ Bekliyor |
| Sprint 8 | Alerts + Multi-source Ingestion | ⏳ Bekliyor |
| Sprint 9 | MVP Polish + Deployment | ⏳ Bekliyor |

---

## Sprint 3 — Event Processing Pipelines

### Hedefler
- [ ] LLM abstraction layer genişletme (cost-aware routing)
- [ ] Classification pipeline (kategori, macro/micro)
- [ ] Event extraction pipeline (structured event JSON)
- [ ] Entity linking pipeline (event → asset bağlantısı)
- [ ] Duplicate detection (pgvector semantic similarity)
- [ ] Event-asset linking (event_asset_links tablosu populate)
- [ ] Cost tracking service (model_runs tablosu)
- [ ] Prompt versioning system (prompt_versions tablosu)
- [ ] Frontend: Event feed, Event detail page

### Pipeline Akışı
```
Signal Ingestion
    → Classification (haiku) — category, macro/micro
    → Event Extraction (haiku) — structured event JSON
    → Entity Linking (haiku) — affected assets, sectors
    → Embedding Generation (OpenAI ada-002 veya benzeri)
    → Duplicate Detection (pgvector cosine similarity)
    → Graph Enrichment (sonnet) — knowledge graph update
```

### Model Routing (Sprint 3)
| Pipeline Stage | Model | Sebep |
|----------------|-------|-------|
| classification | claude-haiku-4-5 | Yüksek hacim, basit görev |
| event_extraction | claude-haiku-4-5 | Yüksek hacim, basit görev |
| entity_linking | claude-haiku-4-5 | Yüksek hacim |
| graph_enrichment | claude-sonnet-4-5 | Orta karmaşıklık |

---

## Sprint 4 — Knowledge Graph + Agent Simulation

### Hedefler
- [ ] Graph query API (neighbors, path traversal, second-order impact)
- [ ] Graph enrichment pipeline (otomatik node/edge oluşturma)
- [ ] Agent profiles seed (10 arketip DB'ye yükleme)
- [ ] Agent simulation pipeline (tek agent, sonra paralel)
- [ ] Frontend: Event impact visualization (graph görselleştirme)

### 10 Agent Arketip
1. Retail Investor
2. Momentum Trader
3. Value Investor
4. Macro Fund Manager
5. Long-Only Institutional
6. Short Seller
7. Regulator/Policy Watcher
8. Media Narrative Analyst
9. Market Maker
10. Risk-Off / Defensive

---

## Sprint 5 — Scenario Engine

### Hedefler
- [ ] Scenario module (CRUD, run yönetimi)
- [ ] Multi-agent paralel simülasyon (10 agent concurrent)
- [ ] Scenario synthesis pipeline (bull/base/bear)
- [ ] Consistency checker (çelişki tespiti)
- [ ] Citation checker (kaynak doğrulama)
- [ ] Frontend: Scenario Lab (builder + sonuç görünümü)

### Senaryo Çıktı Yapısı
```json
{
  "bull_case": { "narrative": "", "probability": 0.3, "key_drivers": [], "target_impacts": [], "timeframe": "" },
  "base_case": { ... },
  "bear_case": { ... },
  "consensus_direction": "",
  "divergence_points": [],
  "key_risks": [],
  "contrarian_angle": "",
  "confidence_band": { "low": 0.2, "mid": 0.5, "high": 0.8 }
}
```

---

## Sprint 6 — Reports + Daily Briefing

### Hedefler
- [ ] Report generation pipeline (7 aşamalı)
- [ ] Report module (CRUD, share token, versioning)
- [ ] PDF export (server-side, headless Chrome veya @react-pdf)
- [ ] Daily briefing job (cron, sabah 07:00 UTC)
- [ ] Frontend: Report viewer, Briefing page, PDF download

### Report Sections
1. Event Summary
2. Why It Matters
3. Impact Map
4. Agent Reactions Summary
5. Scenarios (Bull/Base/Bear)
6. Key Risks
7. Contrarian Angle
8. Follow-Up Signals to Watch
9. Confidence Level
10. Unknowns

---

## Sprint 7 — Portfolio Module

### Hedefler
- [ ] Portfolio CRUD
- [ ] Holdings management (add/update/remove)
- [ ] CSV import
- [ ] Sector / country / asset class exposure breakdown
- [ ] Macro sensitivity scoring (rate, USD, oil sensitivity)
- [ ] Event vulnerability scan (aktif olaylar hangi holdingleri etkiler)
- [ ] Scenario impact overlay (senaryo → portföy etkisi)
- [ ] Frontend: Portfolio page (holdings tablosu, exposure heatmap)

---

## Sprint 8 — Alerts + Multi-Source Ingestion

### Hedefler
- [ ] Alert module (CRUD, trigger logic)
- [ ] Alert check job (scheduled, her 15 dakika)
- [ ] Multi-source ingestion (en az 3 kaynak aktif)
- [ ] Hallucination detection iyileştirme
- [ ] Frontend: Alert configuration, notification center

### Alert Tipleri
- `narrative_shift` — sentiment belirgin düşüş/artış
- `event_impact` — takip edilen varlığa yüksek etkili olay
- `risk_threshold` — konsantrasyon riski eşik aşımı
- `price_move` — fiyat hareketi (ileride, API entegrasyonuyla)

---

## Sprint 9 — MVP Polish + Deployment

### Hedefler
- [ ] Disclaimer layer (her sayfa, her rapor)
- [ ] Audit logging (tüm kritik aksiyonlar)
- [ ] Error handling hardening
- [ ] Performance optimizasyon (query, cache)
- [ ] E2E testler (kritik akışlar)
- [ ] Docker → staging deployment pipeline
- [ ] Dokümantasyon (API, architecture, deployment)

---

## Teknik Mimari Özeti

### Tech Stack
| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | NestJS 10, Node.js 22 |
| Database | PostgreSQL 16 + pgvector |
| Cache/Queue | Redis 7, BullMQ |
| AI | Anthropic (haiku/sonnet), OpenAI (embeddings) |
| Infra | Docker Compose, Turborepo |

### Mevcut Modüller (Sprint 2 sonrası)
```
apps/api/src/modules/
├── auth/          ✅ JWT auth, register/login/refresh
├── health/        ✅ Health check endpoint
├── assets/        ✅ Asset CRUD
├── watchlists/    ✅ Watchlist CRUD + items
├── sources/       ✅ Source management (RSS, API, manual)
├── events/        ✅ Event CRUD
├── queue/         ✅ BullMQ processors (event, embedding, asset-linking, graph-update)
├── knowledge-graph/ ✅ Graph nodes + edges CRUD
└── llm/           ✅ Provider-agnostic LLM (Anthropic + OpenAI)
```

### Sıradaki Eklenecek Modüller
```
apps/api/src/modules/
├── agents/        🔄 Sprint 4 — Agent profiles + simulation
├── scenarios/     🔄 Sprint 5 — Scenario CRUD + runs
├── portfolio/     🔄 Sprint 7 — Portfolio + holdings
├── reports/       🔄 Sprint 6 — Report generation + PDF
├── alerts/        🔄 Sprint 8 — Alert rules + triggers
└── briefing/      🔄 Sprint 6 — Daily briefing job

apps/api/src/ai/
├── pipelines/     🔄 Sprint 3 — Classification, extraction, linking
├── prompts/       🔄 Sprint 3 — Versioned prompt templates
└── validation/    🔄 Sprint 5 — Consistency + citation checker
```

---

## Veri Modeli Özeti

### Core Tables (Mevcut migration'larda olması gerekenler)
- `organisations` — Multi-tenant izolasyon
- `users` — Auth, roles
- `api_keys` — Programmatic access
- `assets` — Ticker, asset class, sector
- `watchlists` + `watchlist_items`
- `sources` — RSS/API/manual kaynaklar
- `events` — Ingested news/data + pgvector embedding
- `event_asset_links` — Event ↔ Asset ilişkisi
- `graph_nodes` + `graph_edges` — Knowledge graph
- `agent_profiles` — 10 arketip tanımları
- `scenarios` + `scenario_runs` — Senaryo ve sonuçları
- `portfolios` + `holdings`
- `reports` + `citations`
- `alerts`
- `model_runs` — AI cost tracking
- `prompt_versions` — Prompt versioning
- `audit_logs`

---

## Prompt Tasarım Prensipleri

1. **Role-based** — Her prompt net bir persona ve görev tanımı içerir
2. **Structured JSON output** — Her aşamadan tipli veri döner
3. **Chain-of-thought** — `reasoning` field zorunlu
4. **Citation slots** — Her iddia için kaynak referansı
5. **Confidence field** — Her çıktıda 0-1 güven skoru
6. **Versioned** — `prompt_versions` tablosunda takip edilir
7. **Decision support language** — "buy/sell" dili yasak, "may impact / could affect" kullanılır

---

## Risk Matrisi

| Risk | Seviye | Önlem |
|------|--------|-------|
| LLM Hallucination | Yüksek | Citation checker, consistency checker, confidence scoring |
| Yatırım tavsiyesi algısı | Yüksek | Zorunlu disclaimer, "decision support" dili, legal review |
| Veri kalitesi / tazeliği | Yüksek | Credibility scoring, timestamp görünürlüğü, stale data uyarısı |
| LLM maliyet patlaması | Orta | Cost-aware routing, org bazlı bütçe limiti, token tahmini |
| Agent simülasyon kalitesi | Orta | Prompt tuning, eval harness, human review loop |
| Multi-tenant veri sızıntısı | Yüksek | Her sorguda org_id, RLS policies, izolasyon testleri |

---

## Kritik Kararlar (Alındı)

- **Monorepo**: Turborepo ✅
- **Backend**: NestJS ✅
- **Frontend**: Next.js App Router ✅
- **DB**: PostgreSQL + pgvector ✅
- **Queue**: BullMQ (Redis) ✅
- **LLM**: Provider-agnostic (Anthropic primary, OpenAI fallback) ✅
- **Auth**: JWT + refresh tokens ✅
- **PDF Export**: Karar verilmedi — @react-pdf veya Puppeteer (Sprint 6'da)
- **Chart Library**: Karar verilmedi — Recharts veya TradingView Lightweight Charts (Sprint 3 frontend'inde)
- **Email**: Karar verilmedi — Resend veya AWS SES (Sprint 8'de)
