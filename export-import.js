const IMPORT_SUPPORTED_VERSION = 1;

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');
const ioStatusEl = document.getElementById('io-status');

const conflictDialog = document.getElementById('import-conflict-dialog');
const conflictListEl = document.getElementById('conflict-list');
const conflictConfirmBtn = document.getElementById('conflict-confirm-btn');
const conflictCancelBtn = document.getElementById('conflict-cancel-btn');

exportBtn.addEventListener('click', exportPrompts);
importBtn.addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', () => {
  const file = importFileInput.files[0];
  importFileInput.value = '';
  if (!file) return;
  handleImportFile(file);
});

// --- Export ---

function computeStats() {
  const totalPrompts = prompts.length;

  const ratingSum = prompts.reduce((sum, p) => sum + (Number.isFinite(p.rating) ? p.rating : 0), 0);
  const averageRating = totalPrompts === 0 ? 0 : Math.round((ratingSum / totalPrompts) * 100) / 100;

  const modelCounts = {};
  for (const p of prompts) {
    const model = p.metadata && p.metadata.model;
    if (!model) continue;
    modelCounts[model] = (modelCounts[model] || 0) + 1;
  }

  let mostUsedModel = null;
  let topCount = 0;
  for (const [model, count] of Object.entries(modelCounts)) {
    if (count > topCount) {
      topCount = count;
      mostUsedModel = model;
    }
  }

  return { totalPrompts, averageRating, mostUsedModel };
}

function exportPrompts() {
  const payload = {
    version: IMPORT_SUPPORTED_VERSION,
    exportedAt: new Date().toISOString(),
    stats: computeStats(),
    prompts,
    notes: notesByPromptId,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `prompt-library-export-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showIoStatus(`Exported ${prompts.length} prompt${prompts.length === 1 ? '' : 's'}.`, false);
}

// --- Import: read + validate ---

function handleImportFile(file) {
  file
    .text()
    .then((text) => {
      let raw;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new Error('That file is not valid JSON.');
      }
      return validateImportPayload(raw);
    })
    .then(({ prompts: importedPrompts, notes: importedNotes, skippedPrompts, skippedNotes }) => {
      if (importedPrompts.length === 0) {
        showIoStatus('That file has no valid prompts to import.', true);
        return;
      }

      const existingIds = new Set(prompts.map((p) => p.id));
      const conflicts = importedPrompts.filter((p) => existingIds.has(p.id));

      if (conflicts.length === 0) {
        applyImport(importedPrompts, importedNotes, {}, skippedPrompts, skippedNotes);
        return;
      }

      openConflictDialog(conflicts, (resolutions) => {
        applyImport(importedPrompts, importedNotes, resolutions, skippedPrompts, skippedNotes);
      });
    })
    .catch((err) => {
      showIoStatus(err.message, true);
    });
}

function validateImportPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Import file must contain a JSON object.');
  }
  if (typeof data.version !== 'number') {
    throw new Error('Import file is missing a "version" field.');
  }
  if (data.version > IMPORT_SUPPORTED_VERSION) {
    throw new Error(
      `This file uses export format v${data.version}, which is newer than this app supports (v${IMPORT_SUPPORTED_VERSION}).`
    );
  }
  if (!Array.isArray(data.prompts)) {
    throw new Error('Import file is missing a "prompts" array.');
  }
  if (data.notes !== undefined && (typeof data.notes !== 'object' || data.notes === null || Array.isArray(data.notes))) {
    throw new Error('Import file\'s "notes" field must be an object.');
  }

  const validPrompts = [];
  let skippedPrompts = 0;
  for (const entry of data.prompts) {
    const prompt = sanitizeImportedPrompt(entry);
    if (prompt) validPrompts.push(prompt);
    else skippedPrompts += 1;
  }

  const validIds = new Set(validPrompts.map((p) => p.id));
  const notesByPrompt = {};
  let skippedNotes = 0;

  for (const [promptId, noteList] of Object.entries(data.notes || {})) {
    if (!validIds.has(promptId) || !Array.isArray(noteList)) {
      if (Array.isArray(noteList)) skippedNotes += noteList.length;
      continue;
    }
    const sanitized = [];
    for (const noteEntry of noteList) {
      const note = sanitizeImportedNote(noteEntry, promptId);
      if (note) sanitized.push(note);
      else skippedNotes += 1;
    }
    notesByPrompt[promptId] = sanitized;
  }

  return { prompts: validPrompts, notes: notesByPrompt, skippedPrompts, skippedNotes };
}

function sanitizeImportedPrompt(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const { id, title, content } = entry;
  if (typeof id !== 'string' || id.trim() === '') return null;
  if (typeof title !== 'string' || title.trim() === '') return null;
  if (typeof content !== 'string') return null;

  const prompt = {
    id,
    title,
    content,
    createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now(),
    rating: Number.isFinite(entry.rating) && entry.rating >= 0 && entry.rating <= 5 ? entry.rating : 0,
  };

  if (entry.metadata && typeof entry.metadata === 'object') {
    prompt.metadata = entry.metadata;
  }

  return prompt;
}

function sanitizeImportedNote(entry, promptId) {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.text !== 'string' || entry.text.trim() === '') return null;

  const now = Date.now();
  return {
    noteId: typeof entry.noteId === 'string' && entry.noteId ? entry.noteId : `${promptId}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    promptId,
    text: entry.text,
    createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : now,
    updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : now,
  };
}

// --- Import: conflict resolution ---

function openConflictDialog(conflicts, onConfirm) {
  conflictListEl.innerHTML = '';

  for (const importedPrompt of conflicts) {
    const existingPrompt = prompts.find((p) => p.id === importedPrompt.id);

    const item = document.createElement('li');
    item.className = 'conflict-item';
    item.dataset.promptId = importedPrompt.id;

    const label = document.createElement('div');
    label.className = 'conflict-item-label';

    const existingTitleEl = document.createElement('strong');
    existingTitleEl.textContent = existingPrompt.title;

    const incomingTitleEl = document.createElement('span');
    incomingTitleEl.className = 'conflict-item-sub';
    incomingTitleEl.textContent = `Incoming: "${importedPrompt.title}"`;

    label.append(existingTitleEl, incomingTitleEl);

    const select = document.createElement('select');
    select.className = 'conflict-resolution-select';
    select.innerHTML = `
      <option value="skip">Keep existing</option>
      <option value="replace">Replace with incoming</option>
      <option value="duplicate">Keep both</option>
    `;

    item.append(label, select);
    conflictListEl.appendChild(item);
  }

  conflictDialog.querySelectorAll('[data-bulk]').forEach((btn) => {
    btn.onclick = () => {
      const value = btn.dataset.bulk;
      conflictListEl.querySelectorAll('.conflict-resolution-select').forEach((sel) => {
        sel.value = value;
      });
    };
  });

  conflictConfirmBtn.onclick = () => {
    const resolutions = {};
    conflictListEl.querySelectorAll('.conflict-item').forEach((item) => {
      const select = item.querySelector('.conflict-resolution-select');
      resolutions[item.dataset.promptId] = select.value;
    });
    conflictDialog.close();
    onConfirm(resolutions);
  };

  conflictCancelBtn.onclick = () => {
    conflictDialog.close();
    showIoStatus('Import canceled.', false);
  };

  conflictDialog.showModal();
}

// --- Import: merge + persist (with rollback on failure) ---

function applyImport(importedPrompts, importedNotes, resolutions, skippedPrompts, skippedNotes) {
  const backup = {
    prompts: JSON.parse(JSON.stringify(prompts)),
    notes: JSON.parse(JSON.stringify(notesByPromptId)),
  };

  const existingIds = new Set(prompts.map((p) => p.id));
  let added = 0;
  let replaced = 0;
  let skipped = 0;
  let duplicated = 0;

  for (const importedPrompt of importedPrompts) {
    const notesForPrompt = importedNotes[importedPrompt.id] || [];

    if (!existingIds.has(importedPrompt.id)) {
      prompts.push(importedPrompt);
      if (notesForPrompt.length) notesByPromptId[importedPrompt.id] = notesForPrompt;
      added += 1;
      continue;
    }

    const resolution = resolutions[importedPrompt.id] || 'skip';

    if (resolution === 'replace') {
      const index = prompts.findIndex((p) => p.id === importedPrompt.id);
      prompts[index] = importedPrompt;
      notesByPromptId[importedPrompt.id] = notesForPrompt;
      replaced += 1;
    } else if (resolution === 'duplicate') {
      const newId = makeId();
      prompts.push({ ...importedPrompt, id: newId });
      if (notesForPrompt.length) {
        notesByPromptId[newId] = notesForPrompt.map((n) => ({ ...n, promptId: newId }));
      }
      duplicated += 1;
    } else {
      skipped += 1;
    }
  }

  try {
    savePrompts();
    saveNotes();
  } catch {
    prompts = backup.prompts;
    notesByPromptId = backup.notes;
    try {
      savePrompts();
      saveNotes();
    } catch {
      // Best-effort: in-memory state is restored even if this re-write also fails.
    }
    render();
    showIoStatus('Import failed while saving — your previous data has been restored.', true);
    return;
  }

  render();

  const parts = [
    added && `${added} added`,
    replaced && `${replaced} replaced`,
    duplicated && `${duplicated} kept as duplicates`,
    skipped && `${skipped} skipped`,
    skippedPrompts && `${skippedPrompts} invalid entries ignored`,
    skippedNotes && `${skippedNotes} invalid notes ignored`,
  ].filter(Boolean);

  showIoStatus(`Import complete: ${parts.join(', ') || 'no changes'}.`, false);
}

// --- Status message ---

function showIoStatus(message, isError) {
  ioStatusEl.textContent = message;
  ioStatusEl.hidden = false;
  ioStatusEl.classList.toggle('io-status-error', isError);
  ioStatusEl.classList.toggle('io-status-success', !isError);
}
