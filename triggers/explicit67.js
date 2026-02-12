const EXPLICIT_PATTERNS = [
    /.*67.*/i,
    /.*6\s*[-]\s*7.*/i,
    /.*6\s+7.*/i,
    /.*6\s*,\s*7.*/i,
    /.*six(?:\s|-)?seven.*/i
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
