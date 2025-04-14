/**
 * @import {ClientEvent, WorkerEvent, ServerEvent} from "../types";
 */
const state = {
  tab: null,
  ws: null,
};

/**
 * @param {WorkerEvent} event
 */
function dispatch(event) {
  console.log('dispatching', event);
  const to_client = ['worker:message'];
  const to_server = ['worker:partial-response', 'worker:final-response'];
  if (to_client.includes(event.type)) {
    if (!state.tab) {
      return console.error('Trying to send event while no tab', event);
    }
    chrome.tabs.sendMessage(state.tab, event);
  }
  if (to_server.includes(event.type)) {
    if (!state.ws) {
      return console.error('Trying to send event while no socket connection', event);
    }
    state.ws.send(JSON.stringify(event));
  }
}

/**
 *
 * @param {ClientEvent | ServerEvent} event
 */
async function handle(event, sender) {
  if (event.type === 'client:ping') return handle_ping(sender);
  console.log('handling', event);
  if (event.type === 'server:message') return dispatch({ type: 'worker:message', message: event.message });
  if (event.type === 'client:partial-response') return dispatch({ type: 'worker:partial-response', response: event.response });
  if (event.type === 'client:final-response') {
    dispatch({ type: 'worker:final-response', response: event.response });
    state.ws = null;
    return;
  }
}

async function handle_ping(sender) {
  if (state.ws) return;
  state.tab = sender.tab?.id;
  state.ws = await connect_to_server();
  if (!state.ws) return;
  state.ws.onmessage = (message) => {
    handle(JSON.parse(message.data));
  };
}

async function connect_to_server() {
  try {
    const ws = new WebSocket('ws://localhost:3331/chat');
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    return ws;
  } catch {}
  return null;
}

chrome.runtime.onMessage.addListener(handle);
