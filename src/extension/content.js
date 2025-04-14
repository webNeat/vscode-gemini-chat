/**
 * @import {ClientEvent, WorkerEvent} from "../types";
 */

/**
 * @param {ClientEvent} event
 */
function dispatch(event) {
  if (event.type !== 'client:ping') console.log('dispatching', event);
  chrome.runtime.sendMessage(event);
}

/**
 * @param {WorkerEvent} event
 */
async function handle(event) {
  console.log('handling', event);
  if (event.type === 'worker:message') {
    dispatch({ type: 'client:partial-response', response: 'Sending ...' });
    await handle_message(event.message);
  }
}

async function handle_message(message) {
  const textarea = document.querySelector('textarea[aria-label^="Type something"]');
  let button = document.querySelector('button[aria-label="Run"]');
  textarea.value = message;
  textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  await wait_for(() => !button.disabled);
  button.click();
  await wait_for(() => {
    button = document.querySelector('button[aria-label="Run"]');
    return button.innerText.indexOf('Stop') !== -1;
  });
  while (button.innerText.indexOf('Stop') !== -1) {
    const response = await get_response();
    if (response) dispatch({ type: 'client:partial-response', response });
    await wait(250);
  }
  dispatch({ type: 'client:final-response', response: await get_response() });
}

async function get_response() {
  const last_message_container = Array.from(document.querySelectorAll('ms-chat-turn')).pop();
  const thinking_container = last_message_container.querySelector('mat-expansion-panel');
  if (thinking_container) return 'Thinking...';
  let response = '';
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'TEXTAREA') {
          response = node.value;
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const options_button = last_message_container.querySelector('button[aria-label="Open options"]');
  options_button.click();
  await wait(250);
  const markdown_span = document.querySelector('span.copy-markdown-button');
  markdown_span.click();
  let tries = 0;
  while (!response && tries < 10) {
    await wait(100);
    tries++;
  }
  observer.disconnect();
  return response;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function wait_for(fn, ms = 250) {
  while (!fn()) await wait(ms);
}

chrome.runtime.onMessage.addListener(handle);
setInterval(() => dispatch({ type: 'client:ping' }), 1000);
