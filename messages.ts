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

export const messageSchema = z.union([
  initSchema,
  echoSchema,
  generateSchema,
]);

export type InitRequest = z.infer<typeof initSchema>;
export type EchoRequest = z.infer<typeof echoSchema>;
export type GenerateRequest = z.infer<typeof generateSchema>;
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

export type ErrorResponse = BaseResponse & {
  body: {
    type: "error";
    code: number;
    text: string;
  };
};

export type GenerateResponse = BaseResponse & {
  body: {
    type: "generate_ok";
    id: string;
  };
};

export type Response =
  | InitResponse
  | EchoResponse
  | GenerateResponse
  | ErrorResponse;
