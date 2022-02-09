import mongoose from 'mongoose';

const coursesSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  code: String,
  name: String,
  description: String,
  author: mongoose.Schema.Types.ObjectId,
  accesses: [
    {
      user: mongoose.Schema.Types.ObjectId,
    },
  ],
});

export default mongoose.model('Course', coursesSchema);
