/**
 * Zod schemas for parsing incoming messages,
 * and typescript types for same, and outgoing messages.
 */

import { z } from "zod";

const baseMessageSchema = z.object({
  src: z.string(),
  dest: z.string(),
});

const initSchema = baseMessageSchema.extend({
  body: z.object({
    type: z.literal("init"),
    msg_id: z.optional(z.number()),
    node_id: z.string(),
    node_ids: z.array(z.string()),
  }),
});

const echoSchema = baseMessageSchema.extend({
  body: z.object({
    type: z.literal("echo"),
    msg_id: z.optional(z.number()),
    echo: z.string(),
  }),
});

const generateSchema = baseMessageSchema.extend({
  body: z.object({
    type: z.literal("generate"),
    msg_id: z.optional(z.number()),
  }),
});

const broadcastSchema = baseMessageSchema.extend({
  body: z.object({
    type: z.literal("broadcast"),
    msg_id: z.optional(z.number()),
    message: z.number(),
  }),
});

const readSchema = baseMessageSchema.extend({
  body: z.object({
    type: z.literal("read"),
    msg_id: z.optional(z.number()),
  }),
});

const topologySchema = baseMessageSchema.extend({
  body: z.object({
    type: z.literal("topology"),
    msg_id: z.optional(z.number()),
    topology: z.record(z.string(), z.array(z.string())),
  }),
});

export const messageSchema = z.union([
  initSchema,
  echoSchema,
  generateSchema,
  broadcastSchema,
  readSchema,
  topologySchema,
]);

export type InitRequest = z.infer<typeof initSchema>;
export type EchoRequest = z.infer<typeof echoSchema>;
export type GenerateRequest = z.infer<typeof generateSchema>;
export type BroadcastRequest = z.infer<typeof broadcastSchema>;
export type ReadRequest = z.infer<typeof readSchema>;
export type TopologyRequest = z.infer<typeof topologySchema>;
export type Message = z.infer<typeof messageSchema>;

type BaseResponse = {
  src: string;
  dest: string;
  body: { msg_id?: number; in_reply_to?: string };
};

export type InitResponse = BaseResponse & {
  body: {
    type: "init_ok";
  };
};

export type EchoResponse = BaseResponse & {
  body: {
    type: "echo_ok";
    echo: string;
  };
};

export type GenerateResponse = BaseResponse & {
  body: {
    type: "generate_ok";
    id: string;
  };
};

export type BroadcastResponse = BaseResponse & {
  body: {
    type: "broadcast_ok";
  };
};

export type ReadResponse = BaseResponse & {
  body: {
    type: "read_ok";
    messages: number[];
  };
};

export type TopologyResponse = BaseResponse & {
  body: {
    type: "topology_ok";
  };
};

export type ErrorResponse = BaseResponse & {
  body: {
    type: "error";
    code: number;
    text: string;
  };
};

export type Response =
  | InitResponse
  | EchoResponse
  | GenerateResponse
  | BroadcastResponse
  | ReadResponse
  | TopologyResponse
  | ErrorResponse;
