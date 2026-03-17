// ── Shared Pipeline Types ──

export type EventCategory =
  | 'earnings'
  | 'macro'
  | 'geopolitical'
  | 'corporate'
  | 'regulatory'
  | 'market_structure'
  | 'other';

export type MacroMicro = 'macro' | 'micro';

export type ImpactDirection = 'positive' | 'negative' | 'neutral' | 'unknown';

export type ImpactType = 'direct' | 'indirect' | 'sector' | 'macro';

// ── Classification Pipeline ──

export interface ClassificationInput {
  title: string;
  summary?: string;
  body?: string;
}

export interface ClassificationOutput {
  category: EventCategory;
  macroMicro: MacroMicro;
  timeSensitivity: 'immediate' | 'hours' | 'days' | 'weeks';
  significanceScore: number; // 1-10
  reasoning: string;
  confidence: number; // 0-1
}

// ── Event Extraction Pipeline ──

export interface EventExtractionInput {
  title: string;
  summary?: string;
  body?: string;
  category: EventCategory;
  macroMicro: MacroMicro;
}

export interface ExtractedAsset {
  ticker: string;
  name?: string;
  impactType: ImpactType;
  impactDirection: ImpactDirection;
  confidence: number;
}

export interface EventExtractionOutput {
  headline: string;
  summary: string;
  keyEntities: string[];
  affectedAssets: ExtractedAsset[];
  affectedSectors: string[];
  affectedRegions: string[];
  keyRisks: string[];
  reasoning: string;
  confidence: number;
}

// ── Entity Linking Pipeline ──

export interface EntityLinkingInput {
  extractedAssets: ExtractedAsset[];
}

export interface LinkedAsset {
  assetId: string;
  ticker: string;
  impactType: ImpactType;
  impactDirection: ImpactDirection;
  confidence: number;
}

export interface EntityLinkingOutput {
  linkedAssets: LinkedAsset[];
  unresolved: string[]; // tickers extracted but not found in DB
}

// ── Pipeline Context ──

export interface PipelineContext {
  orgId: string;
  traceId: string;
  stage: string;
}
