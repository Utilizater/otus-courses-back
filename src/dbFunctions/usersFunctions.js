import mongoose from 'mongoose';
import User from '../models/users.js';
import bcrypt from 'bcrypt';

const saltRounds = 3;

export const createUser = async (login, password) => {
  const existingUserLogin = await User.findOne({ login });
  if (existingUserLogin) {
    throw new Error('There is user with current login');
  }

  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);

  const user = new User({
    _id: mongoose.Types.ObjectId(),
    login,
    password: hash,
  });
  await user.save();
  return {
    userId: user._id,
    login: user.login,
  };
};

export const authorization = async (login, password) => {
  const user = await User.findOne({ login });
  if (!user) {
    throw new Error('There is no user with this login');
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error('Wrong password');
  }
  return {
    userId: user._id,
    login: user.login,
  };
};

export const getUserList = async (exceptUserId) => {
  const users = await User.find();
  return users
    .filter((user) => user._id.toString() !== exceptUserId)
    .map((user) => ({
      _id: user._id,
      login: user.login,
    }));
};
