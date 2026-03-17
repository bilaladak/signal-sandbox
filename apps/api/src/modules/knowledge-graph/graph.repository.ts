import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../database/database.module';

// ── Database Interfaces ──

export interface DbGraphNode {
  id: string;
  org_id: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbGraphEdge {
  id: string;
  org_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  weight: number;
  properties: Record<string, unknown>;
  created_at: string;
}

export interface CreateNodeData {
  label: string;
  type: string;
  properties?: Record<string, unknown>;
  embedding?: number[];
}

export interface UpdateNodeData {
  label?: string;
  type?: string;
  properties?: Record<string, unknown>;
  embedding?: number[];
}

export interface CreateEdgeData {
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  weight?: number;
  properties?: Record<string, unknown>;
}

export interface ConnectedNodeResult {
  node: DbGraphNode;
  edge: DbGraphEdge;
}

@Injectable()
export class GraphRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  // ── Node Operations ──

  async findNodes(
    orgId: string,
    query: { page?: number; limit?: number; type?: string; search?: string },
  ): Promise<{ data: DbGraphNode[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['org_id = $1'];
    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (query.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(query.type);
      paramIndex++;
    }

    if (query.search) {
      conditions.push(`label ILIKE $${paramIndex}`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM graph_nodes WHERE ${whereClause}`,
      params,
    );

    const { rows } = await this.pool.query<DbGraphNode>(
      `SELECT id, org_id, label, type, properties, embedding, created_at, updated_at
       FROM graph_nodes
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return {
      data: rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findNodeById(orgId: string, id: string): Promise<DbGraphNode | null> {
    const { rows } = await this.pool.query<DbGraphNode>(
      `SELECT id, org_id, label, type, properties, embedding, created_at, updated_at
       FROM graph_nodes
       WHERE id = $1 AND org_id = $2`,
      [id, orgId],
    );
    return rows[0] || null;
  }

  async createNode(orgId: string, data: CreateNodeData): Promise<DbGraphNode> {
    const id = uuidv4();
    const { rows } = await this.pool.query<DbGraphNode>(
      `INSERT INTO graph_nodes (id, org_id, label, type, properties, embedding)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        orgId,
        data.label,
        data.type,
        JSON.stringify(data.properties || {}),
        data.embedding || null,
      ],
    );
    return rows[0];
  }

  async updateNode(
    orgId: string,
    id: string,
    data: UpdateNodeData,
  ): Promise<DbGraphNode | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.label !== undefined) {
      setClauses.push(`label = $${paramIndex}`);
      params.push(data.label);
      paramIndex++;
    }

    if (data.type !== undefined) {
      setClauses.push(`type = $${paramIndex}`);
      params.push(data.type);
      paramIndex++;
    }

    if (data.properties !== undefined) {
      setClauses.push(`properties = $${paramIndex}`);
      params.push(JSON.stringify(data.properties));
      paramIndex++;
    }

    if (data.embedding !== undefined) {
      setClauses.push(`embedding = $${paramIndex}`);
      params.push(data.embedding);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return this.findNodeById(orgId, id);
    }

    params.push(id, orgId);
    const idIndex = paramIndex;
    const orgIndex = paramIndex + 1;

    const { rows } = await this.pool.query<DbGraphNode>(
      `UPDATE graph_nodes
       SET ${setClauses.join(', ')}
       WHERE id = $${idIndex} AND org_id = $${orgIndex}
       RETURNING *`,
      params,
    );

    return rows[0] || null;
  }

  async deleteNode(orgId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM graph_nodes WHERE id = $1 AND org_id = $2`,
      [id, orgId],
    );
    return (rowCount ?? 0) > 0;
  }

  async findSimilarNodes(
    orgId: string,
    embedding: number[],
    limit: number = 10,
  ): Promise<DbGraphNode[]> {
    const { rows } = await this.pool.query<DbGraphNode>(
      `SELECT id, org_id, label, type, properties, embedding, created_at, updated_at
       FROM graph_nodes
       WHERE org_id = $1 AND embedding IS NOT NULL
       ORDER BY embedding <=> $2
       LIMIT $3`,
      [orgId, JSON.stringify(embedding), limit],
    );
    return rows;
  }

  // ── Edge Operations ──

  async findEdges(
    orgId: string,
    query: { nodeId?: string; relationType?: string; page?: number; limit?: number },
  ): Promise<{ data: DbGraphEdge[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['org_id = $1'];
    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (query.nodeId) {
      conditions.push(`(source_node_id = $${paramIndex} OR target_node_id = $${paramIndex})`);
      params.push(query.nodeId);
      paramIndex++;
    }

    if (query.relationType) {
      conditions.push(`relationship = $${paramIndex}`);
      params.push(query.relationType);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM graph_edges WHERE ${whereClause}`,
      params,
    );

    const { rows } = await this.pool.query(
      `SELECT id, org_id, source_node_id, target_node_id,
              relationship AS relation_type, weight, properties, created_at
       FROM graph_edges
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return {
      data: rows as DbGraphEdge[],
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findEdgeById(orgId: string, id: string): Promise<DbGraphEdge | null> {
    const { rows } = await this.pool.query(
      `SELECT id, org_id, source_node_id, target_node_id,
              relationship AS relation_type, weight, properties, created_at
       FROM graph_edges
       WHERE id = $1 AND org_id = $2`,
      [id, orgId],
    );
    return (rows[0] as DbGraphEdge) || null;
  }

  async createEdge(orgId: string, data: CreateEdgeData): Promise<DbGraphEdge> {
    const id = uuidv4();
    const { rows } = await this.pool.query(
      `INSERT INTO graph_edges (id, org_id, source_node_id, target_node_id, relationship, weight, properties)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, org_id, source_node_id, target_node_id,
                 relationship AS relation_type, weight, properties, created_at`,
      [
        id,
        orgId,
        data.sourceNodeId,
        data.targetNodeId,
        data.relationType,
        data.weight ?? 1.0,
        JSON.stringify(data.properties || {}),
      ],
    );
    return rows[0] as DbGraphEdge;
  }

  async deleteEdge(orgId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM graph_edges WHERE id = $1 AND org_id = $2`,
      [id, orgId],
    );
    return (rowCount ?? 0) > 0;
  }

  async findConnectedNodes(
    orgId: string,
    nodeId: string,
    depth: number = 1,
  ): Promise<ConnectedNodeResult[]> {
    // For depth 1, get direct connections in both directions
    const { rows } = await this.pool.query(
      `SELECT
         gn.id, gn.org_id, gn.label, gn.type, gn.properties, gn.embedding,
         gn.created_at, gn.updated_at,
         ge.id AS edge_id, ge.org_id AS edge_org_id,
         ge.source_node_id, ge.target_node_id,
         ge.relationship AS relation_type, ge.weight,
         ge.properties AS edge_properties, ge.created_at AS edge_created_at
       FROM graph_edges ge
       INNER JOIN graph_nodes gn
         ON (gn.id = ge.target_node_id AND ge.source_node_id = $2)
         OR (gn.id = ge.source_node_id AND ge.target_node_id = $2)
       WHERE ge.org_id = $1
       ORDER BY ge.created_at DESC`,
      [orgId, nodeId],
    );

    return rows.map((row: Record<string, unknown>) => ({
      node: {
        id: row.id as string,
        org_id: row.org_id as string,
        label: row.label as string,
        type: row.type as string,
        properties: row.properties as Record<string, unknown>,
        embedding: row.embedding as number[] | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      },
      edge: {
        id: row.edge_id as string,
        org_id: row.edge_org_id as string,
        source_node_id: row.source_node_id as string,
        target_node_id: row.target_node_id as string,
        relation_type: row.relation_type as string,
        weight: row.weight as number,
        properties: row.edge_properties as Record<string, unknown>,
        created_at: row.edge_created_at as string,
      },
    }));
  }

  async findPathBetween(
    orgId: string,
    sourceNodeId: string,
    targetNodeId: string,
  ): Promise<{ nodes: DbGraphNode[]; edges: DbGraphEdge[] } | null> {
    // Recursive CTE for BFS path finding with max depth 4
    const { rows } = await this.pool.query(
      `WITH RECURSIVE path_search AS (
         -- Base case: edges from source node
         SELECT
           ge.source_node_id,
           ge.target_node_id,
           ge.id AS edge_id,
           ARRAY[ge.source_node_id, ge.target_node_id] AS path,
           1 AS depth
         FROM graph_edges ge
         WHERE ge.org_id = $1
           AND ge.source_node_id = $2

         UNION ALL

         -- Recursive case: extend path in forward direction
         SELECT
           ge.source_node_id,
           ge.target_node_id,
           ge.id AS edge_id,
           ps.path || ge.target_node_id,
           ps.depth + 1
         FROM path_search ps
         INNER JOIN graph_edges ge
           ON ge.source_node_id = ps.target_node_id
           AND ge.org_id = $1
         WHERE ps.depth < 4
           AND NOT ge.target_node_id = ANY(ps.path)
       )
       SELECT path, edge_id
       FROM path_search
       WHERE target_node_id = $3
       ORDER BY depth ASC
       LIMIT 1`,
      [orgId, sourceNodeId, targetNodeId],
    );

    if (rows.length === 0) {
      // Try bidirectional: also search treating edges as undirected
      const { rows: biRows } = await this.pool.query(
        `WITH RECURSIVE path_search AS (
           SELECT
             CASE
               WHEN ge.source_node_id = $2 THEN ge.target_node_id
               ELSE ge.source_node_id
             END AS current_node,
             ge.id AS edge_id,
             ARRAY[$2::uuid,
               CASE
                 WHEN ge.source_node_id = $2 THEN ge.target_node_id
                 ELSE ge.source_node_id
               END
             ] AS path,
             ARRAY[ge.id] AS edge_ids,
             1 AS depth
           FROM graph_edges ge
           WHERE ge.org_id = $1
             AND (ge.source_node_id = $2 OR ge.target_node_id = $2)

           UNION ALL

           SELECT
             CASE
               WHEN ge.source_node_id = ps.current_node THEN ge.target_node_id
               ELSE ge.source_node_id
             END AS current_node,
             ge.id AS edge_id,
             ps.path ||
               CASE
                 WHEN ge.source_node_id = ps.current_node THEN ge.target_node_id
                 ELSE ge.source_node_id
               END,
             ps.edge_ids || ge.id,
             ps.depth + 1
           FROM path_search ps
           INNER JOIN graph_edges ge
             ON (ge.source_node_id = ps.current_node OR ge.target_node_id = ps.current_node)
             AND ge.org_id = $1
           WHERE ps.depth < 4
             AND NOT (
               CASE
                 WHEN ge.source_node_id = ps.current_node THEN ge.target_node_id
                 ELSE ge.source_node_id
               END
             ) = ANY(ps.path)
         )
         SELECT path, edge_ids
         FROM path_search
         WHERE current_node = $3
         ORDER BY depth ASC
         LIMIT 1`,
        [orgId, sourceNodeId, targetNodeId],
      );

      if (biRows.length === 0) {
        return null;
      }

      const pathNodeIds: string[] = biRows[0].path;
      const pathEdgeIds: string[] = biRows[0].edge_ids;

      const [nodeResult, edgeResult] = await Promise.all([
        this.pool.query<DbGraphNode>(
          `SELECT id, org_id, label, type, properties, embedding, created_at, updated_at
           FROM graph_nodes
           WHERE id = ANY($1) AND org_id = $2`,
          [pathNodeIds, orgId],
        ),
        this.pool.query(
          `SELECT id, org_id, source_node_id, target_node_id,
                  relationship AS relation_type, weight, properties, created_at
           FROM graph_edges
           WHERE id = ANY($1) AND org_id = $2`,
          [pathEdgeIds, orgId],
        ),
      ]);

      // Sort nodes in path order
      const nodeMap = new Map(nodeResult.rows.map((n) => [n.id, n]));
      const orderedNodes = pathNodeIds
        .map((nid) => nodeMap.get(nid))
        .filter((n): n is DbGraphNode => n !== undefined);

      return {
        nodes: orderedNodes,
        edges: edgeResult.rows as DbGraphEdge[],
      };
    }

    // Extract path node IDs and fetch full node/edge data
    const pathNodeIds: string[] = rows[0].path;

    // We need all edge IDs along the path — re-query with the path
    const edgeParams: unknown[] = [orgId];
    const edgeConditions: string[] = [];
    for (let i = 0; i < pathNodeIds.length - 1; i++) {
      const srcIdx = edgeParams.length + 1;
      const tgtIdx = edgeParams.length + 2;
      edgeConditions.push(`(source_node_id = $${srcIdx} AND target_node_id = $${tgtIdx})`);
      edgeParams.push(pathNodeIds[i], pathNodeIds[i + 1]);
    }

    const [nodeResult, edgeResult] = await Promise.all([
      this.pool.query<DbGraphNode>(
        `SELECT id, org_id, label, type, properties, embedding, created_at, updated_at
         FROM graph_nodes
         WHERE id = ANY($1) AND org_id = $2`,
        [pathNodeIds, orgId],
      ),
      this.pool.query(
        `SELECT id, org_id, source_node_id, target_node_id,
                relationship AS relation_type, weight, properties, created_at
         FROM graph_edges
         WHERE org_id = $1 AND (${edgeConditions.join(' OR ')})`,
        edgeParams,
      ),
    ]);

    // Sort nodes in path order
    const nodeMap = new Map(nodeResult.rows.map((n) => [n.id, n]));
    const orderedNodes = pathNodeIds
      .map((nid) => nodeMap.get(nid))
      .filter((n): n is DbGraphNode => n !== undefined);

    return {
      nodes: orderedNodes,
      edges: edgeResult.rows as DbGraphEdge[],
    };
  }
}
