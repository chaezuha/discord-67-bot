function normalizeContent(content) {
  // NFKC folds fullwidth digits (６７), superscripts, etc. into ASCII.
  const text = content.normalize("NFKC").toLowerCase();

  // CJK numerals → ASCII; compound first so 六十七 becomes "67", not "6十7".
  return text
    .replace(/六十七/g, "67")
    .replace(/六十/g, "60")
    .replace(/六/g, "6")
    .replace(/七/g, "7");
}

module.exports = {
  normalizeContent
};
