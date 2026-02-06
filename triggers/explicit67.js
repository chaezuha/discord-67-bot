const EXPLICIT_PATTERNS = [
  /\b67\b/i,
  /#\s*67\b/i,
  /\bno\.?\s*67\b/i,
  /\b6\s*[-]\s*7\b/i,
  /\b6\s+7\b/i,
  /\b6\s*,\s*7\b/i,
  /\bsix(?:\s|-)?seven\b/i
];

function hasExplicit67(content) {
  if (!content || typeof content !== "string") {
    return false;
  }

  return EXPLICIT_PATTERNS.some((pattern) => pattern.test(content));
}

module.exports = {
  hasExplicit67
};
