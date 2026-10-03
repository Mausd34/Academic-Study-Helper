/**
 * AI Study Assistant — chat UI over the deterministic offline engine.
 * No API key lives in this file; a backend bridge is opt-in and disabled.
 */
import { esc, uid, nowISO, timeAgo } from '../core/utils.js';
import { getState, list, update } from '../core/store.js';
import { answer, suggestedPrompts, backendMode, askBackend } from '../core/assistant.js';
import { getLanguage } from '../core/i18n.js';
import { toastOk, confirmDialog, card, badge, segmented } from '../core/ui.js';
import { emptyState, attach } from '../core/parts.js';

const GREETING = {
  en: 'Hi! I run entirely offline on this device. Ask me about your routine, attendance, exams or study plan — or pick one of the suggestions.',
  bn: 'হ্যালো! আমি সম্পূর্ণ অফলাইনে কাজ করি। রুটিন, উপস্থিতি, পরীক্ষা বা স্টাডি প্ল্যান নিয়ে জিজ্ঞাসা করুন — অথবা নিচের প্রস্তাবগুলো বেছে নিন।',
};

function bubble(message) {
  const mine = message.role === 'user';
  return `<div class="bubble ${mine ? 'user' : 'bot'}">
    <p>${esc(message.text).replace(/\n/g, '<br>')}</p>
    <small>${esc(timeAgo(message.at))}</small>
  </div>`;
}

/** Ask a question and persist both sides of the exchange. */
export async function ask(question) {
  const q = String(question ?? '').trim();
  if (!q) return;
  const state = getState();
  const language = getLanguage();
  const mode = backendMode();

  let reply = null;
  if (mode.enabled) {
    reply = await askBackend(q, { language, state });
  }
  if (!reply) {
    reply = answer(q, { language, state });
  }

  update((draft) => {
    draft.chat = [
      ...(draft.chat || []),
      { id: uid('msg'), role: 'user', text: q, at: nowISO() },
      { id: uid('msg'), role: 'bot', text: reply.text, at: nowISO() },
    ].slice(-80);
  });
}

async function clearChat() {
  if (!(getState().chat || []).length) return;
  const ok = await confirmDialog({ title: 'Clear chat history?', message: 'All messages will be deleted. This cannot be undone.', confirmLabel: 'Clear' });
  if (!ok) return;
  update((draft) => { draft.chat = []; });
  toastOk('Chat history cleared.');
}

export function renderAssistant(root) {
  const state = getState();
  const language = getLanguage();
  const prompts = suggestedPrompts(language);
  const messages = state.chat || [];
  const mode = backendMode();

  root.innerHTML = `
    <div class="chat-layout">
      ${card('', `
        <div class="chat-log" id="chatLog" role="log" aria-live="polite">
          ${messages.length
    ? messages.map(bubble).join('')
    : `<div class="bubble bot"><p>${esc(GREETING[language] || GREETING.en)}</p></div>`}
        </div>
        <form class="chat-input" id="chatForm">
          <input id="askInput" type="text" autocomplete="off" placeholder="${language === 'bn' ? 'প্রশ্ন লিখুন…' : 'Ask a study question…'}" aria-label="Ask the study assistant">
          <button class="btn primary" type="submit">Send</button>
        </form>`, { className: 'chat-card', actions: messages.length ? '<button class="btn small ghost" data-clear-chat>Clear chat</button>' : '' })}

      <aside class="chat-side">
        ${card('Suggested prompts', `<div class="prompt-list">${prompts.map((p) => `<button class="btn ghost prompt" type="button" data-prompt="${esc(p)}">${esc(p)}</button>`).join('')}</div>`)}

        ${card('How this works', `
          <p class="muted small">This assistant is <strong>offline and rule-based</strong>. It answers from a local knowledge base and from <em>your own</em> schedule, attendance and deadlines — nothing leaves your device.</p>
          <p class="muted small">Status: ${badge(mode.enabled ? 'Backend connected' : 'Offline mode', mode.enabled ? 'success' : 'muted')}</p>
          <p class="muted small">${esc(mode.note)}</p>`)}

        ${card('Planned AI features', `
          <ul class="tag-list muted">
            <li class="tag">AI study plan</li>
            <li class="tag">Quiz / MCQ generator</li>
            <li class="tag">Flashcards</li>
            <li class="tag">Note summariser</li>
            <li class="tag">PDF summariser</li>
            <li class="tag">Viva preparation</li>
            <li class="tag">Weak-topic detection</li>
          </ul>
          <p class="muted small">These are <strong>not</strong> implemented. They require a real LLM through a backend, and the app will not pretend otherwise.</p>`)}
      </aside>
    </div>`;

  const log = root.querySelector('#chatLog');
  if (log) log.scrollTop = log.scrollHeight;

  attach(root, ({ signal }) => {
    const form = root.querySelector('#chatForm');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = root.querySelector('#askInput');
      const value = input?.value || '';
      if (!value.trim()) return;
      await ask(value);
      renderAssistant(root);
    }, { signal });

    root.addEventListener('click', async (event) => {
      const el = event.target.closest('button');
      if (!el) return;
      if (el.dataset.prompt) {
        await ask(el.dataset.prompt);
        renderAssistant(root);
        return;
      }
      if (el.hasAttribute('data-clear-chat')) clearChat();
    }, { signal });
  });
}
