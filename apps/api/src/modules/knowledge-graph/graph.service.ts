import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  GraphRepository,
  DbGraphNode,
  DbGraphEdge,
  CreateNodeData,
  UpdateNodeData,
  CreateEdgeData,
  ConnectedNodeResult,
} from './graph.repository';

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(private readonly graphRepo: GraphRepository) {}

  // ── Node Operations ──

  async findNodes(
    orgId: string,
    query: { page?: number; limit?: number; type?: string; search?: string },
  ): Promise<{ data: DbGraphNode[]; total: number }> {
    this.logger.log(`Finding nodes for org ${orgId} with query: ${JSON.stringify(query)}`);
    return this.graphRepo.findNodes(orgId, query);
  }

  async findNodeById(orgId: string, id: string): Promise<DbGraphNode> {
    this.logger.log(`Finding node ${id} for org ${orgId}`);
    const node = await this.graphRepo.findNodeById(orgId, id);
    if (!node) {
      throw new NotFoundException(`Node ${id} not found`);
    }
    return node;
  }

  async createNode(orgId: string, data: CreateNodeData): Promise<DbGraphNode> {
    this.logger.log(`Creating node for org ${orgId}: ${data.label} (${data.type})`);
    return this.graphRepo.createNode(orgId, data);
  }

  async updateNode(orgId: string, id: string, data: UpdateNodeData): Promise<DbGraphNode> {
    this.logger.log(`Updating node ${id} for org ${orgId}`);
    const node = await this.graphRepo.updateNode(orgId, id, data);
    if (!node) {
      throw new NotFoundException(`Node ${id} not found`);
    }
    return node;
  }

  async deleteNode(orgId: string, id: string): Promise<void> {
    this.logger.log(`Deleting node ${id} for org ${orgId}`);
    const deleted = await this.graphRepo.deleteNode(orgId, id);
    if (!deleted) {
      throw new NotFoundException(`Node ${id} not found`);
    }
  }

  async getNodeGraph(
    orgId: string,
    nodeId: string,
    depth: number = 1,
  ): Promise<{ node: DbGraphNode; connected: ConnectedNodeResult[] }> {
    this.logger.log(`Getting node graph for ${nodeId}, depth ${depth}`);
    const node = await this.graphRepo.findNodeById(orgId, nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const connected = await this.graphRepo.findConnectedNodes(orgId, nodeId, depth);
    return { node, connected };
  }

  async searchSimilar(
    orgId: string,
    embedding: number[],
    limit: number = 10,
  ): Promise<DbGraphNode[]> {
    this.logger.log(`Searching similar nodes for org ${orgId}, limit ${limit}`);
    return this.graphRepo.findSimilarNodes(orgId, embedding, limit);
  }

  // ── Edge Operations ──

  async findEdges(
    orgId: string,
    query: { nodeId?: string; relationType?: string; page?: number; limit?: number },
  ): Promise<{ data: DbGraphEdge[]; total: number }> {
    this.logger.log(`Finding edges for org ${orgId} with query: ${JSON.stringify(query)}`);
    return this.graphRepo.findEdges(orgId, query);
  }

  async createEdge(orgId: string, data: CreateEdgeData): Promise<DbGraphEdge> {
    this.logger.log(
      `Creating edge for org ${orgId}: ${data.sourceNodeId} -> ${data.targetNodeId}`,
    );

    // Validate source node exists
    const sourceNode = await this.graphRepo.findNodeById(orgId, data.sourceNodeId);
    if (!sourceNode) {
      throw new BadRequestException(`Source node ${data.sourceNodeId} not found`);
    }

    // Validate target node exists
    const targetNode = await this.graphRepo.findNodeById(orgId, data.targetNodeId);
    if (!targetNode) {
      throw new BadRequestException(`Target node ${data.targetNodeId} not found`);
    }

    return this.graphRepo.createEdge(orgId, data);
  }

  async deleteEdge(orgId: string, id: string): Promise<void> {
    this.logger.log(`Deleting edge ${id} for org ${orgId}`);
    const deleted = await this.graphRepo.deleteEdge(orgId, id);
    if (!deleted) {
      throw new NotFoundException(`Edge ${id} not found`);
    }
  }

  async findPath(
    orgId: string,
    sourceNodeId: string,
    targetNodeId: string,
  ): Promise<{ nodes: DbGraphNode[]; edges: DbGraphEdge[] }> {
    this.logger.log(`Finding path from ${sourceNodeId} to ${targetNodeId}`);

    // Validate both nodes exist
    const [sourceNode, targetNode] = await Promise.all([
      this.graphRepo.findNodeById(orgId, sourceNodeId),
      this.graphRepo.findNodeById(orgId, targetNodeId),
    ]);

    if (!sourceNode) {
      throw new NotFoundException(`Source node ${sourceNodeId} not found`);
    }
    if (!targetNode) {
      throw new NotFoundException(`Target node ${targetNodeId} not found`);
    }

    const path = await this.graphRepo.findPathBetween(orgId, sourceNodeId, targetNodeId);
    if (!path) {
      return { nodes: [], edges: [] };
    }

    return path;
  }
}
