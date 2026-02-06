const WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)*/g;

function splitSentences(text) {
  return text
    .split(/[.!?\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function countWordSyllables(word) {
  const cleaned = (word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) {
    return 0;
  }

  if (cleaned.length <= 3) {
    return 1;
  }

  let normalized = cleaned;
  if (normalized.endsWith("e") && !normalized.endsWith("le") && !normalized.endsWith("ye")) {
    normalized = normalized.slice(0, -1);
  }

  const groups = normalized.match(/[aeiouy]+/g);
  return Math.max(groups ? groups.length : 1, 1);
}

function countSentenceSyllables(sentence) {
  const words = sentence.match(WORD_PATTERN) ?? [];
  return words.reduce((total, word) => total + countWordSyllables(word), 0);
}

function detectSyllableTriggers(content) {
  if (!content || typeof content !== "string") {
    return { reasons: [], triggerTypes: [] };
  }

  const sentences = splitSentences(content);
  if (sentences.length === 0) {
    return { reasons: [], triggerTypes: [] };
  }

  const sentenceSyllables = sentences.map((sentence) => countSentenceSyllables(sentence));
  const totalSyllables = sentenceSyllables.reduce((sum, count) => sum + count, 0);

  const reasons = [];
  const triggerTypes = [];

  if (totalSyllables === 67) {
    reasons.push("your message was exactly 67 syllables long");
    triggerTypes.push("syllable67");
  }

  if (sentenceSyllables.length >= 2 && sentenceSyllables[0] === 6 && sentenceSyllables[1] === 7) {
    reasons.push("sentence one had 6 syllables and sentence two had 7");
    triggerTypes.push("syllable67pair");
  }

  return { reasons, triggerTypes };
}

module.exports = {
  detectSyllableTriggers
};
