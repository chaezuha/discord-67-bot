function countTriggers(content) {
  const trimmed = (content ?? "").trim();
  const charCount = trimmed.length;
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  const reasons = [];
  const triggerTypes = [];

  if (charCount === 67) {
    reasons.push("your message was exactly 67 characters long");
    triggerTypes.push("charcount");
  }

  if (wordCount === 67) {
    reasons.push("your message was exactly 67 words long");
    triggerTypes.push("wordcount");
  }

  return {
    charCount,
    wordCount,
    reasons,
    triggerTypes
  };
}

module.exports = {
  countTriggers
};
