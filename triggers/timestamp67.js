function isTimestamp67(date) {
  if (!(date instanceof Date)) {
    return false;
  }

  return date.getUTCMinutes() === 6 && date.getUTCSeconds() === 7;
}

module.exports = {
  isTimestamp67
};
