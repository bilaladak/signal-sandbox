-- ============================================
-- Migration 002: pgvector HNSW indexes
-- Enables fast approximate nearest-neighbor search for duplicate detection
-- ============================================

-- HNSW index for events embedding (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_events_embedding_hnsw
  ON events USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- HNSW index for graph_nodes embedding (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_graph_nodes_embedding_hnsw
  ON graph_nodes USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
