const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

// Counts user-perceived characters, so an emoji is 1 rather than its
// UTF-16 code-unit length.
function graphemeCount(text) {
  let count = 0;
  for (const _ of graphemeSegmenter.segment(text)) {
    count += 1;
  }
  return count;
}

function countTriggers(content) {
  const trimmed = (content ?? "").trim();
  const charCount = graphemeCount(trimmed);
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
