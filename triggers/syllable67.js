const { syllable } = require("syllable");

const WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)*/g;

function splitSentences(text) {
  return text
    .split(/[.!?\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function countSentenceSyllables(sentence) {
  const words = sentence.match(WORD_PATTERN) ?? [];
  return words.reduce((total, word) => total + syllable(word), 0);
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
  countSentenceSyllables,
  detectSyllableTriggers
};
