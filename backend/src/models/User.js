import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 6 },
  username:  { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
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
  return { id: this._id, email: this.email, username: this.username, createdAt: this.createdAt };
};

export default mongoose.model('User', userSchema);
