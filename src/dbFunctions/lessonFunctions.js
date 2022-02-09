import mongoose from 'mongoose';
import Lesson from '../models/lesson.js';
import path from 'path';
import { deleteFolderRecursive } from '../utils/removerFolder.js';

export const getLessonById = async (lessonId) => {
  return await Lesson.findOne({ _id: lessonId });
};

export const createLesson = async (lesson) => {
  const newLesson = new Lesson({
    _id: mongoose.Types.ObjectId(),
    courseId: lesson.courseId,
    name: lesson.name,
    description: lesson.description,
  });
  return await newLesson.save();
};

export const editLesson = async (lesson) => {
  const { _id, name, description } = lesson;
  await Lesson.updateOne({ _id }, { name, description });
};

export const removeLessonById = async (lessonId) => {
  await Lesson.deleteOne({ _id: lessonId });
};

export const removeLessonsByCourseId = async (courseId) => {
  await Lesson.deleteMany({ courseId });
};

export const removeFileByLessonId = async (lessonId) => {
  const lesson = await Lesson.findOne({ _id: lessonId });
  const courseId = lesson.courseId;
  try {
    const rout = path.resolve('src', 'videos', courseId, lessonId);
    deleteFolderRecursive(rout);
    return;
  } catch {
    return;
  }
};

export const checkLessonPermission = async (userId, lessonId) => {
  const [lesson] = await Lesson.aggregate([
    {
      $match: {
        _id: {
          $eq: mongoose.Types.ObjectId(lessonId),
        },
      },
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'courseId',
        foreignField: '_id',
        as: 'courses',
      },
    },
    {
      $unwind: {
        path: '$courses',
      },
    },
    {
      $project: {
        'courses.author': 1,
      },
    },
  ]);

  const courseUserId = lesson?.courses?.author;
  return courseUserId?.toString() === userId;
};
