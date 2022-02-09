import mongoose from 'mongoose';

const commentSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  date: mongoose.Schema.Types.Date,
  lessonId: mongoose.Schema.Types.ObjectId,
  text: String,
  author: mongoose.Schema.Types.ObjectId,
});

export default mongoose.model('Comment', commentSchema);
