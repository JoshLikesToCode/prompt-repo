const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isValidISODate(value) {
  return typeof value === 'string' && ISO_8601_REGEX.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * @param {string} text
 * @param {boolean} [isCode=false]
 * @returns {{min: number, max: number, confidence: 'high'|'medium'|'low'}}
 */
function estimateTokens(text, isCode = false) {
  if (typeof text !== 'string') {
    throw new Error('estimateTokens: text must be a string');
  }
  if (typeof isCode !== 'boolean') {
    throw new Error('estimateTokens: isCode must be a boolean');
  }

  const trimmed = text.trim();
  const wordCount = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  const charCount = text.length;

  let min = 0.75 * wordCount;
  let max = 0.25 * charCount;

  if (isCode) {
    min *= 1.3;
    max *= 1.3;
  }

  // Very short single "words" (e.g. a long URL) can push the char-based
  // max below the word-based min; keep min/max ordered either way.
  if (min > max) {
    [min, max] = [max, min];
  }

  min = Math.round(min);
  max = Math.round(max);

  // Confidence bands key off the upper (worst-case) estimate.
  let confidence;
  if (max < 1000) confidence = 'high';
  else if (max <= 5000) confidence = 'medium';
  else confidence = 'low';

  return { min, max, confidence };
}

/**
 * @param {string} modelName
 * @param {string} content
 * @returns {{model: string, createdAt: string, updatedAt: string, tokenEstimate: object}}
 */
function trackModel(modelName, content) {
  if (typeof modelName !== 'string' || modelName.trim().length === 0) {
    throw new Error('trackModel: modelName must be a non-empty string');
  }
  if (modelName.length > 100) {
    throw new Error('trackModel: modelName must be 100 characters or fewer');
  }
  if (typeof content !== 'string') {
    throw new Error('trackModel: content must be a string');
  }

  const now = new Date().toISOString();

  return {
    model: modelName,
    createdAt: now,
    updatedAt: now,
    tokenEstimate: estimateTokens(content, false),
  };
}

/**
 * @param {{model: string, createdAt: string, updatedAt: string, tokenEstimate: object}} metadata
 * @returns {object} a new metadata object with a refreshed updatedAt
 */
function updateTimestamps(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('updateTimestamps: metadata must be an object');
  }
  if (!isValidISODate(metadata.createdAt)) {
    throw new Error('updateTimestamps: metadata.createdAt must be a valid ISO 8601 string');
  }

  const updatedAt = new Date().toISOString();
  if (Date.parse(updatedAt) < Date.parse(metadata.createdAt)) {
    throw new Error('updateTimestamps: updatedAt cannot be earlier than createdAt');
  }

  return { ...metadata, updatedAt };
}
