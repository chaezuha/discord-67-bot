const WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)*/g;

function letterCount(word) {
  return (word || "").replace(/[^A-Za-z]/g, "").length;
}

function hasSixSevenWordPair(content) {
  if (!content || typeof content !== "string") {
    return false;
  }

  const words = content.match(WORD_PATTERN) ?? [];

  for (let i = 0; i < words.length - 1; i += 1) {
    if (letterCount(words[i]) === 6 && letterCount(words[i + 1]) === 7) {
      return true;
    }
  }

  return false;
}

module.exports = {
  hasSixSevenWordPair
};
