import mongoose from 'mongoose';
import Course from '../models/courses.js';
import pkg from 'lodash';
import { deleteFolderRecursive } from '../utils/removerFolder.js';

const { camelCase } = pkg;

export const createNewCourse = async (obj, userId) => {
  const course = new Course({
    _id: mongoose.Types.ObjectId(),
    code: camelCase(obj.courseName),
    name: obj.courseName,
    description: obj.courseDescription,
    author: userId,
    accesses: obj.accesses,
  });
  const savedCourse = await course.save();

  return { courseId: savedCourse._id };
};

export const getCoursesList = async () => {
  const coursesList = await Course.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'author',
      },
    },
    {
      $unwind: {
        path: '$author',
      },
    },
    {
      $project: {
        code: 1,
        name: 1,
        description: 1,
        'author._id': 1,
        'author.login': 1,
      },
    },
  ]);
  return coursesList;
};

export const getCourseById = async (courseId, userId) => {
  const [course] = await Course.aggregate([
    {
      $match: {
        _id: {
          $eq: mongoose.Types.ObjectId(courseId),
        },
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
      $lookup: {
        from: 'lessons',
        localField: '_id',
        foreignField: 'courseId',
        as: 'lessons',
      },
    },
    {
      $project: {
        _id: 1,
        code: 1,
        description: 1,
        name: 1,
        accesses: 1,
        author: 1,
        'users._id': 1,
        'users.login': 1,
        'lessons._id': 1,
        'lessons.name': 1,
        'lessons.description': 1,
      },
    },
  ]);

  let access = false;
  if (userId === course?.author?.toString()) {
    access = true;
    return { course, access };
  }

  const courseEntitlement = (course.accesses ?? []).find(
    (item) => item?.user?.toString() === userId
  );
  if (courseEntitlement) {
    access = true;
  }

  return { course, access };
};

export const editCourseById = async (course) => {
  const { _id, name, description, accesses } = course;
  await Course.updateOne(
    { _id },
    { name, description, code: camelCase(name), accesses }
  );
};

export const checkCoursePermission = async (userId, courseId) => {
  const course = await Course.findOne({ _id: courseId, author: userId });
  if (course) return true;
  else return false;
};

export const removeCourseById = async (courseId) => {
  removeFilesByCourseId(courseId);
  await Course.deleteOne({ _id: courseId });
};

const removeFilesByCourseId = (courseId) => {
  try {
    const rout = path.resolve('src', 'videos', courseId);
    deleteFolderRecursive(rout);
    return;
  } catch {
    return;
  }
};
