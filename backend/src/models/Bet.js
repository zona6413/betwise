import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId:     { type: String }, // id généré côté client pour dédoublonnage
  matchId:      { type: String },
  date:         { type: String },
  homeTeam:     { type: String },
  awayTeam:     { type: String },
  league:       { type: String },
  outcome:      { type: String },
  outcomeName:  { type: String },
  category:     { type: String },
  odds:         { type: Number },
  stake:        { type: Number },
  bookmaker:    { type: String, default: '' },
  status:       { type: String, enum: ['pending','won','lost','void'], default: 'pending' },
  profit:       { type: Number, default: null },
  autoResolved: { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now },
});

export default mongoose.model('Bet', betSchema);
