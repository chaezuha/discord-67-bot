const { normalizeContent } = require("./normalize");

// Patterns run against normalized text (lowercased, fullwidth/CJK numerals mapped to ASCII).
const EXPLICIT_PATTERNS = [
    // digit-digit: 67, 607, 6-7, 6 - 7, 6 7, 6,7, 6.7, 6:07, 6:7
    /6[\s\-–—_,.:;]*0?7/,
    // word-word / word-digit: six seven, six-seven, sixseven, Six. Seven., six 7
    /six[\W_]*(?:seven|7\b)/,
    // 6 seven
    /\b6[\W_]*seven/,
    // sixty seven, sixty-seven, sixty 7
    /sixty[\W_]*(?:seven|7\b)/,
    // 60 seven
    /\b60[\W_]*seven/
];

function hasExplicit67(content) {
    if (!content || typeof content !== "string") {
        return false;
    }

    const normalized = normalizeContent(content);

    return EXPLICIT_PATTERNS.some((pattern) => pattern.test(normalized));
}

module.exports = {
    hasExplicit67
};
