const MAX_TOKENS_BETWEEN = 10;

function splitSentences(text) {
  return text
    .split(/[.!?\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function tokenize(sentence) {
  return sentence.match(/[A-Za-z0-9']+/g) ?? [];
}

function hasDigit(token) {
  return /\d/.test(token);
}

function hasSixThenSevenSequence(content) {
  if (!content || typeof content !== "string") {
    return false;
  }

  const sentences = splitSentences(content);

  for (const sentence of sentences) {
    const tokens = tokenize(sentence);

    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i] !== "6") {
        continue;
      }

      let wordsBetween = 0;
      for (let j = i + 1; j < tokens.length; j += 1) {
        const token = tokens[j];

        if (token === "7") {
          return wordsBetween <= MAX_TOKENS_BETWEEN;
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
  }

  return false;
}

module.exports = {
  hasSixThenSevenSequence
};
