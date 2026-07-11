const test = require("node:test");
const assert = require("node:assert/strict");

const { hasExplicit67 } = require("../triggers/explicit67");
const { hasSixThenSevenSequence } = require("../triggers/sequence67");
const { countTriggers } = require("../triggers/count67");
const { detectSyllableTriggers } = require("../triggers/syllable67");
const { isTimestamp67 } = require("../triggers/timestamp67");
const { hasSixSevenWordPair } = require("../triggers/wordLength67");

test("explicit67", async (t) => {
  await t.test("matches documented explicit forms", () => {
    const positives = [
      "67",
      "#67",
      "no. 67",
      "6-7",
      "6 - 7",
      "6 7",
      "6, 7",
      "six seven",
      "six-seven",
      "sixseven",
      "SIX SEVEN",
      "the score was 67 to 12"
    ];

    for (const content of positives) {
      assert.equal(hasExplicit67(content), true, `expected match: ${content}`);
    }
  });

  await t.test("matches sixty, 607, times, decimals, and mixed word/digit forms", () => {
    const positives = [
      "it's 6:07",
      "6:7",
      "sixty seven",
      "sixty-seven",
      "sixtyseven",
      "607",
      "6.7",
      "6.7 magnitude",
      "six 7",
      "6 seven",
      "sixty 7",
      "60 seven",
      "Six. Seven."
    ];

    for (const content of positives) {
      assert.equal(hasExplicit67(content), true, `expected match: ${content}`);
    }
  });

  await t.test("matches CJK and fullwidth forms", () => {
    const positives = ["六七", "六 七", "六十七", "６７", "6七", "六-7"];

    for (const content of positives) {
      assert.equal(hasExplicit67(content), true, `expected match: ${content}`);
    }
  });

  await t.test("matches 67 as a substring of larger numbers", () => {
    // Current behavior: any "67" substring counts, even inside 667 or 1670.
    assert.equal(hasExplicit67("667"), true);
    assert.equal(hasExplicit67("1670"), true);
  });

  await t.test("rejects non-matching content", () => {
    const negatives = ["hello world", "76", "6 and then 7", "seven six", "seventy six", "six 75"];

    for (const content of negatives) {
      assert.equal(hasExplicit67(content), false, `expected no match: ${content}`);
    }
  });

  await t.test("rejects empty and non-string input", () => {
    assert.equal(hasExplicit67(""), false);
    assert.equal(hasExplicit67(null), false);
    assert.equal(hasExplicit67(undefined), false);
    assert.equal(hasExplicit67(67), false);
  });
});

test("sequence67", async (t) => {
  await t.test("detects 6 followed by 7 in the same sentence", () => {
    assert.equal(hasSixThenSevenSequence("I have 6 cats and 7 dogs"), true);
    assert.equal(hasSixThenSevenSequence("6 then 7"), true);
  });

  await t.test("detects word forms of six and seven", () => {
    assert.equal(hasSixThenSevenSequence("yeah i had six or maybe seven"), true);
    assert.equal(hasSixThenSevenSequence("six then 7"), true);
    assert.equal(hasSixThenSevenSequence("6 then seven"), true);
  });

  await t.test("allows up to 10 words between", () => {
    const tenBetween = `6 ${"word ".repeat(10)}7`;
    const elevenBetween = `6 ${"word ".repeat(11)}7`;

    assert.equal(hasSixThenSevenSequence(tenBetween), true);
    assert.equal(hasSixThenSevenSequence(elevenBetween), false);
  });

  await t.test("rejects when another digit sits between", () => {
    assert.equal(hasSixThenSevenSequence("6 cats 8 dogs 7 birds"), false);
  });

  await t.test("matches across adjacent sentences", () => {
    assert.equal(hasSixThenSevenSequence("It was 6. Then it was 7"), true);
    assert.equal(hasSixThenSevenSequence("I have 6 cats. I have 7 dogs."), true);
  });

  await t.test("does not match beyond adjacent sentences", () => {
    assert.equal(hasSixThenSevenSequence("I have 6 cats. Nothing else here. I have 7 dogs."), false);
  });

  await t.test("requires standalone 6 and 7 tokens", () => {
    assert.equal(hasSixThenSevenSequence("16 cats and 7 dogs"), false);
    assert.equal(hasSixThenSevenSequence("6 cats and 17 dogs"), false);
  });

  await t.test("rejects empty and non-string input", () => {
    assert.equal(hasSixThenSevenSequence(""), false);
    assert.equal(hasSixThenSevenSequence(null), false);
  });
});

test("count67", async (t) => {
  await t.test("triggers on exactly 67 characters", () => {
    const message = "a".repeat(67);
    const result = countTriggers(message);

    assert.equal(result.charCount, 67);
    assert.deepEqual(result.triggerTypes, ["charcount"]);
  });

  await t.test("does not trigger on 66 or 68 characters", () => {
    assert.deepEqual(countTriggers("a".repeat(66)).triggerTypes, []);
    assert.deepEqual(countTriggers("a".repeat(68)).triggerTypes, []);
  });

  await t.test("counts trimmed length", () => {
    const result = countTriggers(`  ${"a".repeat(67)}  `);
    assert.deepEqual(result.triggerTypes, ["charcount"]);
  });

  await t.test("counts emoji as single characters", () => {
    // 😀 is 2 UTF-16 code units but 1 visible character.
    const result = countTriggers("😀".repeat(67));

    assert.equal(result.charCount, 67);
    assert.deepEqual(result.triggerTypes, ["charcount"]);
  });

  await t.test("does not trigger on 67 code units that are fewer graphemes", () => {
    // 33 emoji + 1 letter = 67 UTF-16 code units, but only 34 visible characters.
    const message = `${"😀".repeat(33)}a`;
    assert.equal(message.length, 67);

    const result = countTriggers(message);
    assert.equal(result.charCount, 34);
    assert.deepEqual(result.triggerTypes, []);
  });

  await t.test("triggers on exactly 67 words", () => {
    const message = Array(67).fill("word").join(" ");
    const result = countTriggers(message);

    assert.equal(result.wordCount, 67);
    assert.ok(result.triggerTypes.includes("wordcount"));
  });

  await t.test("does not trigger on 66 or 68 words", () => {
    assert.deepEqual(countTriggers(Array(66).fill("hi").join(" ")).triggerTypes, []);
    assert.deepEqual(countTriggers(Array(68).fill("hi").join(" ")).triggerTypes, []);
  });

  await t.test("handles empty input", () => {
    const result = countTriggers("");
    assert.equal(result.charCount, 0);
    assert.equal(result.wordCount, 0);
    assert.deepEqual(result.triggerTypes, []);
  });
});

test("syllable67", async (t) => {
  await t.test("triggers on exactly 67 total syllables", () => {
    // 67 one-syllable words (each <= 3 letters counts as 1 syllable).
    const message = Array(67).fill("cat").join(" ");
    const result = detectSyllableTriggers(message);

    assert.ok(result.triggerTypes.includes("syllable67"));
  });

  await t.test("does not trigger on 66 total syllables", () => {
    const message = Array(66).fill("cat").join(" ");
    const result = detectSyllableTriggers(message);

    assert.equal(result.triggerTypes.includes("syllable67"), false);
  });

  await t.test("triggers on a 6-syllable sentence followed by a 7-syllable sentence", () => {
    const message = "The cat sat on the mat. The dog ran up and hit me.";
    const result = detectSyllableTriggers(message);

    assert.ok(result.triggerTypes.includes("syllable67pair"));
  });

  await t.test("does not trigger the pair on a single sentence", () => {
    const result = detectSyllableTriggers("The cat sat on the mat.");
    assert.equal(result.triggerTypes.includes("syllable67pair"), false);
  });

  await t.test("returns empty results for empty and non-string input", () => {
    assert.deepEqual(detectSyllableTriggers(""), { reasons: [], triggerTypes: [] });
    assert.deepEqual(detectSyllableTriggers(null), { reasons: [], triggerTypes: [] });
    assert.deepEqual(detectSyllableTriggers(42), { reasons: [], triggerTypes: [] });
  });
});

test("timestamp67", async (t) => {
  await t.test("triggers at X:06:07 UTC", () => {
    assert.equal(isTimestamp67(new Date(Date.UTC(2026, 0, 1, 12, 6, 7))), true);
    assert.equal(isTimestamp67(new Date(Date.UTC(2026, 5, 15, 0, 6, 7))), true);
  });

  await t.test("rejects near misses", () => {
    assert.equal(isTimestamp67(new Date(Date.UTC(2026, 0, 1, 12, 6, 8))), false);
    assert.equal(isTimestamp67(new Date(Date.UTC(2026, 0, 1, 12, 7, 7))), false);
    assert.equal(isTimestamp67(new Date(Date.UTC(2026, 0, 1, 12, 6, 6))), false);
  });

  await t.test("rejects non-Date input", () => {
    assert.equal(isTimestamp67("2026-01-01T12:06:07Z"), false);
    assert.equal(isTimestamp67(null), false);
    assert.equal(isTimestamp67(1234567890), false);
  });
});

test("wordLength67", async (t) => {
  await t.test("triggers on a 6-letter word followed by a 7-letter word", () => {
    assert.equal(hasSixSevenWordPair("little monster"), true);
    assert.equal(hasSixSevenWordPair("I saw a little monster today"), true);
  });

  await t.test("ignores punctuation between words", () => {
    assert.equal(hasSixSevenWordPair("little, monster!"), true);
  });

  await t.test("rejects other length pairs", () => {
    assert.equal(hasSixSevenWordPair("cat dog"), false);
    assert.equal(hasSixSevenWordPair("monster little"), false);
    assert.equal(hasSixSevenWordPair("little"), false);
  });

  await t.test("rejects empty and non-string input", () => {
    assert.equal(hasSixSevenWordPair(""), false);
    assert.equal(hasSixSevenWordPair(null), false);
  });
});
