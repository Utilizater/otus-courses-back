import mongoose from 'mongoose';
import Comment from '../models/comment.js';
import User from '../models/users.js';

export const createComment = async ({ lessonId, text, author }) => {
  const comment = new Comment({
    _id: mongoose.Types.ObjectId(),
    date: new Date(),
    lessonId,
    text,
    author,
  });

  const user = await User.findOne({ _id: author });
  await comment.save();
  return {
    comment,
    userLogin: user.login,
  };
};

export const getCommentsByLessonId = async (lessonId) => {
  return await Comment.aggregate([
    {
      $match: {
        lessonId: mongoose.Types.ObjectId(lessonId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'users',
      },
    },
    {
      $unwind: {
        path: '$users',
      },
    },
    {
      $project: {
        date: 1,
        text: 1,
        'users.login': 1,
      },
    },
  ]);
};
