const cooldownMs = Number.parseInt(process.env.CHANNEL_COOLDOWN_MS ?? "1000", 10);
const rareVariantChance = Number.parseFloat(process.env.RARE_VARIANT_CHANCE ?? "0.01");

module.exports = {
  dbPath: process.env.DB_PATH || "./data/67bot.sqlite",
  cooldownMs: Number.isFinite(cooldownMs) && cooldownMs >= 0 ? cooldownMs : 1000,
  rareVariantChance:
    Number.isFinite(rareVariantChance) && rareVariantChance >= 0 && rareVariantChance <= 1
      ? rareVariantChance
      : 0.01,
  milestoneStep: 67,
  standardResponse: "AYYY ⁶🤷⁷",
  rareVariants: [
    "AYYY ⁶🤷⁷ (nice)",
    "⁶🤷⁷ ... he knows he dyin",
    "DOOT DOOT ⁶🤷⁷",
    "⁶🤷⁷ LaMelo would be proud"
  ]
};
