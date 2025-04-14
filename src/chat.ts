#!/usr/bin/env bun

import type { WorkerEvent } from './types';

const server_port = 3331;
const chat_separator = `\n\n---chat-separator---\n\n`;

async function new_chat() {
  const chat_path = `/tmp/${Date.now()}.chat.md`;
  await Bun.write(chat_path, '');
  console.log(
    JSON.stringify({
      command: 'neat-scripts.files.open',
      args: { path: chat_path },
    }),
  );
}

async function update_chat(chat_path: string) {
  const content = await Bun.file(chat_path).text();
  await Bun.write(chat_path, `${content}${chat_separator}Loading...`);

  const last_message = content.split(chat_separator).at(-1)!;
  let last_response = '';
  await send_message(last_message, async (response) => {
    last_response = response;
    await Bun.write(chat_path, `${content}${chat_separator}${response}`);
  });
  await Bun.write(chat_path, `${content}${chat_separator}${last_response}${chat_separator}`);
}

async function send_message(message: string, on_response: (response: string) => Promise<void>) {
  return new Promise<void>((resolve) => {
    let sent = false;
    const server = Bun.serve({
      port: server_port,
      websocket: {
        open(ws) {
          if (sent) return;
          sent = true;
          ws.send(JSON.stringify({ type: 'server:message', message }));
        },
        message(_, message) {
          const event = JSON.parse(message.toString()) as WorkerEvent;
          if (event.type === 'worker:partial-response' || event.type === 'worker:final-response') {
            on_response(event.response);
          }
          if (event.type === 'worker:final-response') {
            server.stop(true);
            resolve();
          }
        },
      },
      fetch(req, server) {
        if (req.url.endsWith('/chat')) {
          server.upgrade(req);
          return;
        }
        return new Response('Hello World');
      },
    });
  });
}

async function main() {
  const input = await Bun.stdin.json();
  const filename = input.file;

  if (filename.endsWith('.chat.md')) {
    await update_chat(filename);
  } else {
    await new_chat();
  }
}

main().catch(console.error);
