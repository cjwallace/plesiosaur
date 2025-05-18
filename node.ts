/**
 * A Node class to manage mutable state for a single maelstrom node.
 */

class Node {
  nodeId: string = "";
  nodeIds: string[] = [];
  msgId: number = 0;
  messages: number[] = [];
  topology: Record<string, string[]> = {};

  init(node_id: string, node_ids: string[]) {
    this.nodeId = node_id;
    this.nodeIds = node_ids;
  }

  incrementMsgId() {
    this.msgId++;
  }
}

export default Node;
