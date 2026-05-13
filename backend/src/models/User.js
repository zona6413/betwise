import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? '').toLowerCase().trim();

const userSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 6 },
  username:  { type: String, trim: true, default: '' },
  role:      { type: String, enum: ['free', 'pro', 'admin'], default: 'free' },
  subscriptionExpiry: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Auto-promouvoir l'admin
userSchema.pre('save', function (next) {
  if (ADMIN_EMAIL && this.email === ADMIN_EMAIL) this.role = 'admin';
  next();
});

// Hash le mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Vérifie le mot de passe
userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Ne jamais exposer le mot de passe en JSON
userSchema.methods.toPublic = function () {
  return { id: this._id, email: this.email, username: this.username, role: this.role, subscriptionExpiry: this.subscriptionExpiry, createdAt: this.createdAt };
};

// Vérifie si l'utilisateur a accès Pro (admin ou pro actif)
userSchema.methods.isPro = function () {
  if (this.role === 'admin') return true;
  if (this.role === 'pro' && (!this.subscriptionExpiry || this.subscriptionExpiry > new Date())) return true;
  return false;
};

export default mongoose.model('User', userSchema);
