import mongoose from 'mongoose';

const outcomeSchema = new mongoose.Schema({
  matchId:     { type: String, required: true, unique: true },
  date:        { type: String },
  homeTeam:    { type: String },
  awayTeam:    { type: String },
  predictions: { type: mongoose.Schema.Types.Mixed },
  actual:      { type: mongoose.Schema.Types.Mixed },
  recordedAt:  { type: Date, default: Date.now },
});

export default mongoose.models.Outcome ?? mongoose.model('Outcome', outcomeSchema);
