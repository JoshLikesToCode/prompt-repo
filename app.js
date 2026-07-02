const STORAGE_KEY = 'promptLibrary.prompts';
const PREVIEW_LENGTH = 140;

/** @type {Array<{id:string,title:string,content:string,createdAt:number,rating:number}>} */
let prompts = loadPrompts();

const listEl = document.getElementById('prompt-list');
const emptyStateEl = document.getElementById('empty-state');
const formEl = document.getElementById('prompt-form');
const cardTemplate = document.getElementById('prompt-card-template');

formEl.addEventListener('submit', handleAddPrompt);

render();

function loadPrompts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePrompts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
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
    rating: 0,
  });

  savePrompts();
  formEl.reset();
  render();
}

function deletePrompt(promptId) {
  prompts = prompts.filter((p) => p.id !== promptId);
  savePrompts();
  render();
}

function setRating(promptId, newRating) {
  const prompt = prompts.find((p) => p.id === promptId);
  if (!prompt) return;

  prompt.rating = prompt.rating === newRating ? 0 : newRating;
  savePrompts();
  renderStars(promptId, prompt.rating);
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

  const starsContainer = node.querySelector('.stars');
  buildStars(starsContainer, prompt.id, prompt.rating);

  return node;
}

function buildStars(container, promptId, rating) {
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'star-btn';
    star.textContent = i <= rating ? '★' : '☆';
    star.classList.toggle('filled', i <= rating);
    star.setAttribute('aria-label', `Rate ${i} star${i > 1 ? 's' : ''}`);
    star.setAttribute('aria-pressed', String(i <= rating));

    star.addEventListener('mouseenter', () => previewStars(container, i));
    star.addEventListener('mouseleave', () => previewStars(container, rating));
    star.addEventListener('click', () => setRating(promptId, i));

    container.appendChild(star);
  }
}

function previewStars(container, upTo) {
  const stars = container.querySelectorAll('.star-btn');
  stars.forEach((star, index) => {
    star.textContent = index < upTo ? '★' : '☆';
  });
}

function renderStars(promptId, rating) {
  const container = document.querySelector(`[data-prompt-id="${promptId}"] .stars`);
  if (container) buildStars(container, promptId, rating);
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
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
