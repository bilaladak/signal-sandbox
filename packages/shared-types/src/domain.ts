import type { Uuid, ISODateString } from './common';

// ── Assets ──
export type AssetType = 'stock' | 'etf' | 'crypto' | 'commodity' | 'forex' | 'index' | 'bond';

export interface Asset {
  id: Uuid;
  symbol: string;
  name: string;
  type: AssetType;
  sector?: string;
  country?: string;
  createdAt: ISODateString;
}

// ── Events ──
export type EventCategory =
  | 'earnings'
  | 'macro'
  | 'geopolitical'
  | 'regulatory'
  | 'corporate_action'
  | 'sector_shift'
  | 'technical'
  | 'sentiment';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Event {
  id: Uuid;
  title: string;
  summary: string;
  category: EventCategory;
  severity: EventSeverity;
  sourceUrl?: string;
  sourceName: string;
  publishedAt: ISODateString;
  createdAt: ISODateString;
  assets: string[];
}

// ── Scenarios ──
export type ScenarioType = 'bull' | 'base' | 'bear';
export type ScenarioStatus = 'draft' | 'running' | 'completed' | 'failed';

export interface Scenario {
  id: Uuid;
  orgId: Uuid;
  title: string;
  hypothesis: string;
  type: ScenarioType;
  status: ScenarioStatus;
  timeHorizon: string;
  triggerEventIds: Uuid[];
  createdAt: ISODateString;
  completedAt?: ISODateString;
}

// ── Agent Archetypes ──
export type AgentArchetype =
  | 'retail_investor'
  | 'momentum_trader'
  | 'value_investor'
  | 'macro_fund'
  | 'long_only_fund'
  | 'short_seller'
  | 'regulator'
  | 'media_narrative'
  | 'market_maker'
  | 'risk_off_allocator';

export interface AgentReaction {
  agentType: AgentArchetype;
  action: 'buy' | 'sell' | 'hold' | 'hedge' | 'wait';
  confidence: number;
  reasoning: string;
  timeframe: string;
}

// ── Reports ──
export type ReportTone = 'analyst' | 'trader';

export interface Report {
  id: Uuid;
  scenarioId: Uuid;
  orgId: Uuid;
  title: string;
  tone: ReportTone;
  sections: ReportSection[];
  createdAt: ISODateString;
}

export interface ReportSection {
  heading: string;
  content: string;
  order: number;
}
