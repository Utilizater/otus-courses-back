import mongoose from 'mongoose';

const lessonsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  courseId: mongoose.Schema.Types.ObjectId,
  name: String,
  description: String,
});

export default mongoose.model('Lesson', lessonsSchema);
