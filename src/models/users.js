import mongoose from 'mongoose';

const usersSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  login: String,
  password: String,
});

export default mongoose.model('User', usersSchema);
