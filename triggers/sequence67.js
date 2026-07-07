const { normalizeContent } = require("./normalize");

const MAX_TOKENS_BETWEEN = 10;
// A six→seven pair may span at most this many sentences (i.e. adjacent sentences).
const MAX_SENTENCES_SPANNED = 2;

const SIX_TOKENS = new Set(["6", "six"]);
const SEVEN_TOKENS = new Set(["7", "seven"]);

function splitSentences(text) {
  return text
    .split(/[.!?\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function tokenize(sentence) {
  return sentence.match(/[a-z0-9']+/g) ?? [];
}

function hasDigit(token) {
  return /\d/.test(token);
}

function hasSixThenSevenSequence(content) {
  if (!content || typeof content !== "string") {
    return false;
  }

  const tokens = [];
  splitSentences(normalizeContent(content)).forEach((sentence, sentenceIndex) => {
    for (const token of tokenize(sentence)) {
      tokens.push({ token, sentenceIndex });
    }
  });

  for (let i = 0; i < tokens.length; i += 1) {
    if (!SIX_TOKENS.has(tokens[i].token)) {
      continue;
    }

    let wordsBetween = 0;
    for (let j = i + 1; j < tokens.length; j += 1) {
      const { token, sentenceIndex } = tokens[j];

      if (sentenceIndex - tokens[i].sentenceIndex >= MAX_SENTENCES_SPANNED) {
        break;
      }

      if (SEVEN_TOKENS.has(token)) {
        return true;
      }

      if (hasDigit(token)) {
        break;
      }

      wordsBetween += 1;
      if (wordsBetween > MAX_TOKENS_BETWEEN) {
        break;
      }
    }
  }

  return false;
}

module.exports = {
  hasSixThenSevenSequence
};
