import path from 'path';
import fs from 'fs';
import express from 'express';
import 'dotenv/config';
import mongoose from 'mongoose';
import fileupload from 'express-fileupload';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import {
  createUser,
  authorization,
  getUserList,
} from './dbFunctions/usersFunctions.js';
import {
  createNewCourse,
  getCoursesList,
  getCourseById,
  editCourseById,
  checkCoursePermission,
  removeCourseById,
} from './dbFunctions/courseFunctions.js';
import {
  getLessonById,
  createLesson,
  editLesson,
  removeLessonsByCourseId,
  removeFileByLessonId,
  checkLessonPermission,
  removeLessonById,
} from './dbFunctions/lessonFunctions.js';
import {
  createComment,
  getCommentsByLessonId,
} from './dbFunctions/commentFunctions.js';
import { getUserIdFromRequest } from './utils/getUserId.js';
import logger from 'morgan';
// import ExpressBrute from 'express-brute';

mongoose.connect(
  `mongodb+srv://admin:${process.env.MONGO_DB_PASSWORD}@cluster0.hvxrm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`,
  {
    // useMongoClient: true,
  }
);

const app = express();

// const store = new ExpressBrute.MemoryStore();
// const bruteforce = new ExpressBrute(store);

app.use(express.json());
app.use(cors());
app.use(
  fileupload({
    createParentPath: true,
  })
);

app.use(logger('dev'));

const authenticatedToken = (req, res, next) => {
  try {
    const authHeader = req?.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      res.sendStatus(401);
      console.log('err - 401');
      return;
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        res.sendStatus(403);
        console.log('err - 403');
        return;
      }
      req.user = user;
      next();
    });
  } catch (err) {
    res.sendStatus(500);
  }
};

app.get('/courses-list', authenticatedToken, async (req, res) => {
  const coursesList = await getCoursesList();
  res.json({ coursesList });
});

app.post('/create-new-course', authenticatedToken, async (req, res) => {
  const { inputObject } = req.body;
  const userId = getUserIdFromRequest(req);
  const course = await createNewCourse(inputObject, userId);
  res.send(course);
});

app.post('/file-upload', authenticatedToken, async (req, res) => {
  try {
    if (!req?.files?.file) throw res.send('no files provided');
    //1. create lesson
    const { courseId, name, description } = req.body;
    const lesson = await createLesson({
      name,
      courseId,
      description,
    });
    const lessonId = lesson._id.toString();
    //2. store file
    const file = req.files.file;
    const fileName = file.name;
    const rout = path.resolve('src', 'videos', courseId, lessonId, fileName);

    file.mv(rout, (err) => {
      if (err) {
        res.send(err);
      } else {
        res.send('file uploaded');
      }
    });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get('/get-course', authenticatedToken, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { courseId, lessonId } = req.query;
    const course = await getCourseById(courseId, userId);

    if (lessonId !== 'null' && lessonId !== undefined && course.access) {
      const lesson = await getLessonById(lessonId);
      res.json({ course, lesson });
      return;
    }
    res.json({ course });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post(
  '/login',
  /*bruteforce.prevent,*/ async (req, res) => {
    const { login, password } = req.body;
    try {
      const user = await authorization(login, password);
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res.json({ accessToken });
    } catch (e) {
      res.sendStatus(401);
    }
    // const user = await authorization('nick2', 'mypass2');
  }
);

app.post('/create-account', async (req, res) => {
  const { login, password } = req.body;
  try {
    const user = await createUser(login, password);
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
    res.json({ accessToken });
  } catch (e) {
    res.sendStatus(401);
  }
});

app.get('/video', async (req, res) => {
  const { courseId, lessonId } = req.query;
  const range = req.headers.range;
  const videoDirectory = path.resolve('src', 'videos', courseId, lessonId);
  const files = await fs.promises.readdir(videoDirectory);
  const videoPath = path.join(videoDirectory, files[0]);
  const fileStat = await fs.promises.stat(videoPath);
  const fileSize = fileStat.size;
  const CHUNK_SIZE = 10 ** 6; //1 MB
  const start = Number(range.replace(/\D/g, ''));
  const end = Math.min(start + CHUNK_SIZE, fileSize - 1);
  const contentLength = end - start + 1;
  const headers = {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    'Content-Type': 'video/mp4',
  };
  res.writeHead(206, headers);
  const videoStream = fs.createReadStream(videoPath, { start, end });
  videoStream.pipe(res);
});

app.post('/add-comment', authenticatedToken, async (req, res) => {
  const { lessonId, text } = req.body;
  const author = getUserIdFromRequest(req);
  const comment = await createComment({ author, lessonId, text });
  res.send(comment);
});

app.get('/get-comments', authenticatedToken, async (req, res) => {
  const comments = await getCommentsByLessonId(req.query.lessonId);
  res.send(comments);
});

app.put('/edit-course', authenticatedToken, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!checkCoursePermission(userId, req.body.course._id)) {
      res.statusCode(403);
      return;
    }

    await editCourseById(req.body.course);
    req.body.course.lessons.forEach(async (lesson) => {
      await editLesson(lesson);
    });

    res.send(true);
  } catch (err) {
    res.sendStatus(500);
  }
  //TO DO check file re-upload
});

app.delete('/delete-course', authenticatedToken, async (req, res) => {
  try {
    const { courseId } = req.query;
    const userId = getUserIdFromRequest(req);
    if (!checkCoursePermission(userId, courseId)) {
      res.statusCode(403);
      return;
    }
    await removeLessonsByCourseId(courseId);
    await removeCourseById(courseId);
    res.send(true);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.delete('/delete-lesson', authenticatedToken, async (req, res) => {
  try {
    const { lessonId } = req.query;
    const userId = getUserIdFromRequest(req);
    if (!(await checkLessonPermission(userId, lessonId))) {
      res.statusCode(403);
      return;
    }
    await removeFileByLessonId(lessonId);
    await removeLessonById(lessonId);

    res.send(true);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get('/get-user-list', authenticatedToken, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const users = await getUserList(userId);
    res.send(users);
  } catch (err) {}
});

app.get('/test', (req, res) => {
  res.send({
    port: process.env.PORT,
  });
});

app.get('/*', (req, res) => {
  res.send('nothing is here');
});

app.listen(process.env.PORT, () => {
  console.log('Server is running with port ' + process.env.PORT);
});
