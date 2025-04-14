export type ServerEvent = { type: "server:message"; message: string };

export type WorkerEvent =
  | { type: "worker:message"; message: string }
  | { type: "worker:partial-response"; response: string }
  | { type: "worker:final-response"; response: string };

export type ClientEvent =
  | { type: "client:ping" }
  | { type: "client:partial-response"; response: string }
  | { type: "client:final-response"; response: string };
