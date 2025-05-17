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

export const messageSchema = z.union([
  initSchema,
  echoSchema,
]);

export type InitRequest = z.infer<typeof initSchema>;
export type EchoRequest = z.infer<typeof echoSchema>;
export type Message = z.infer<typeof messageSchema>;

type BaseResponse = { src: string; dest: string };

export type InitResponse = BaseResponse & {
  body: {
    type: "init_ok";
    msg_id?: number;
    in_reply_to?: string;
  };
};

export type EchoResponse = BaseResponse & {
  body: {
    type: "echo_ok";
    echo: string;
    msg_id?: number;
    in_reply_to?: string;
  };
};

export type ErrorResponse = BaseResponse & {
  body: {
    type: "error";
    code: number;
    text: string;
    msg_id?: number;
    in_reply_to?: string;
  };
};

export type Response = InitResponse | EchoResponse | ErrorResponse;
