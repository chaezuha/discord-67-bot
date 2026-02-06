function checkEvery67thCounter(store, guildId, channelId) {
  const result = store.incrementChannelCounterAndCheck(guildId, channelId);

  if (result.triggered) {
    return {
      triggered: true,
      reason: "that was the 67th message in this channel since the last trigger",
      triggerType: "every67th"
    };
  }

  return {
    triggered: false,
    reason: null,
    triggerType: null
  };
}

module.exports = {
  checkEvery67thCounter
};
