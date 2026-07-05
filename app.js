const PROMPTS_STORAGE_KEY = 'promptLibrary.prompts';
const NOTES_STORAGE_KEY = 'promptLibrary.notes';
const PREVIEW_LENGTH = 140;

/** @type {Array<{id:string,title:string,content:string,createdAt:number}>} */
let prompts = loadJSON(PROMPTS_STORAGE_KEY, []);

/** @type {Record<string, Array<{noteId:string,promptId:string,text:string,createdAt:number,updatedAt:number}>>} */
let notesByPromptId = loadJSON(NOTES_STORAGE_KEY, {});

const listEl = document.getElementById('prompt-list');
const emptyStateEl = document.getElementById('empty-state');
const formEl = document.getElementById('prompt-form');
const cardTemplate = document.getElementById('prompt-card-template');
const noteItemTemplate = document.getElementById('note-item-template');

formEl.addEventListener('submit', handleAddPrompt);

render();

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function savePrompts() {
  localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
}

function saveNotes() {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesByPromptId));
}

function makeId() {
  return Math.random().toString(36).slice(2, 12);
}

function handleAddPrompt(event) {
  event.preventDefault();
  const formData = new FormData(formEl);
  const title = formData.get('title').trim();
  const content = formData.get('content').trim();
  if (!title || !content) return;

  prompts.unshift({
    id: makeId(),
    title,
    content,
    createdAt: Date.now(),
  });

  savePrompts();
  formEl.reset();
  render();
}

function deletePrompt(promptId) {
  prompts = prompts.filter((p) => p.id !== promptId);
  savePrompts();
  delete notesByPromptId[promptId];
  saveNotes();
  render();
}

async function copyPrompt(promptId) {
  const prompt = prompts.find((p) => p.id === promptId);
  if (!prompt) return;

  const text = `${prompt.title}\n\n${prompt.content}`;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API unavailable or denied; nothing further to do here.
  }
}

// --- Notes ---

function addNote(promptId, text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const now = Date.now();
  const note = {
    noteId: `${promptId}-${now}`,
    promptId,
    text: trimmed,
    createdAt: now,
    updatedAt: now,
  };

  if (!notesByPromptId[promptId]) notesByPromptId[promptId] = [];
  notesByPromptId[promptId].unshift(note);
  saveNotes();
  renderNotes(promptId);
}

function editNote(promptId, noteId, newText) {
  const trimmed = newText.trim();
  if (!trimmed) return;

  const note = (notesByPromptId[promptId] || []).find((n) => n.noteId === noteId);
  if (!note) return;

  note.text = trimmed;
  note.updatedAt = Date.now();
  saveNotes();
  renderNotes(promptId);
}

function deleteNote(promptId, noteId) {
  notesByPromptId[promptId] = (notesByPromptId[promptId] || []).filter((n) => n.noteId !== noteId);
  saveNotes();
  renderNotes(promptId);
}

// --- Rendering ---

function render() {
  listEl.innerHTML = '';
  emptyStateEl.hidden = prompts.length > 0;

  for (const prompt of prompts) {
    listEl.appendChild(buildCard(prompt));
  }
}

function buildCard(prompt) {
  const node = cardTemplate.content.cloneNode(true);
  const card = node.querySelector('.prompt-card');
  card.dataset.promptId = prompt.id;

  node.querySelector('.prompt-title').textContent = prompt.title;
  node.querySelector('.prompt-preview').textContent = truncate(prompt.content, PREVIEW_LENGTH);

  node.querySelector('.delete-btn').addEventListener('click', () => deletePrompt(prompt.id));
  node.querySelector('.copy-btn').addEventListener('click', (e) => flashCopied(e.target, () => copyPrompt(prompt.id)));

  wireNoteForm(node, prompt.id);

  const notesListEl = node.querySelector('.notes-list');
  const notes = notesByPromptId[prompt.id] || [];
  for (const note of notes) {
    notesListEl.appendChild(buildNoteItem(prompt.id, note));
  }

  return node;
}

function wireNoteForm(node, promptId) {
  const addBtn = node.querySelector('.add-note-btn');
  const form = node.querySelector('.note-form');
  const input = node.querySelector('.note-input');
  const saveBtn = node.querySelector('.note-save-btn');
  const cancelBtn = node.querySelector('.note-cancel-btn');

  addBtn.addEventListener('click', () => {
    form.hidden = false;
    input.value = '';
    input.focus();
  });

  cancelBtn.addEventListener('click', () => {
    form.hidden = true;
    input.value = '';
  });

  saveBtn.addEventListener('click', () => {
    addNote(promptId, input.value);
    form.hidden = true;
    input.value = '';
  });
}

function renderNotes(promptId) {
  const card = document.querySelector(`.prompt-card[data-prompt-id="${promptId}"]`);
  if (!card) return;

  const notesListEl = card.querySelector('.notes-list');
  notesListEl.innerHTML = '';

  const notes = notesByPromptId[promptId] || [];
  for (const note of notes) {
    notesListEl.appendChild(buildNoteItem(promptId, note));
  }
}

function buildNoteItem(promptId, note) {
  const node = noteItemTemplate.content.cloneNode(true);
  const item = node.querySelector('.note-item');
  item.dataset.noteId = note.noteId;

  const textEl = node.querySelector('.note-text');
  textEl.textContent = note.text;

  node.querySelector('.note-timestamp').textContent = formatTimestamp(note.updatedAt);

  node.querySelector('.note-delete-btn').addEventListener('click', () => deleteNote(promptId, note.noteId));

  node.querySelector('.note-edit-btn').addEventListener('click', (e) => {
    startEditingNote(item, textEl, promptId, note, e.target);
  });

  return node;
}

function startEditingNote(item, textEl, promptId, note, editBtn) {
  const textarea = document.createElement('textarea');
  textarea.className = 'note-edit-input';
  textarea.value = note.text;
  textarea.rows = 2;

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'note-save-btn';
  saveBtn.textContent = 'Save';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'note-cancel-btn';
  cancelBtn.textContent = 'Cancel';

  const actions = document.createElement('div');
  actions.className = 'note-form-actions';
  actions.append(saveBtn, cancelBtn);

  textEl.replaceWith(textarea);
  const metaEl = item.querySelector('.note-meta');
  metaEl.hidden = true;
  textarea.after(actions);
  textarea.focus();

  saveBtn.addEventListener('click', () => {
    editNote(promptId, note.noteId, textarea.value);
  });

  cancelBtn.addEventListener('click', () => {
    renderNotes(promptId);
  });
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function formatTimestamp(ms) {
  const diffMs = Date.now() - ms;
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  return new Date(ms).toLocaleDateString();
}

function flashCopied(button, action) {
  Promise.resolve(action()).then(() => {
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = original;
    }, 1200);
  });
}
