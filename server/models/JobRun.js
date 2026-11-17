const mongoose = require('mongoose');

// Remembers when a scheduled email job last ran (e.g. the daily bug reminder
// or the weekly section spotlight), so a restart never sends it twice.
const jobRunSchema = new mongoose.Schema({
  _id: String,
  lastDate: String, // the day or week key it last ran for
  lastRunAt: Date,
  sent: Number,
});

module.exports = mongoose.models.JobRun || mongoose.model('JobRun', jobRunSchema);
