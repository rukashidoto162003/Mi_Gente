import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt, { hash } from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";

/*We don’t need to import Express in controllers because req and res are passed as parameters by Express when it invokes the route handler.*/

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Please Provide" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User Not Found" });
    }
    if (await bcrypt.compare(password, user.password)) {
      /*"password" → plain text from user and "user.password" → hashed password from DB*/
      /*and bcrypt.compare() is async and It returns a Promise, not a boolean thats why we use await*/

      let token = crypto.randomBytes(20).toString("hex");
      /*Generates 20 random bytes and Converts to hex string*/
      /*crypto is used to generate a secure random token*/

      user.token = token;
      await user.save();
      /*Adding token to user document and Saving it in database */
      return res.status(httpStatus.OK).json({ token: token });
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "INVALID USERNAME OR PASSWORD" });
    }
  } catch (e) {
    return res.status(500).json({ message: `Something went wrong ${e}` });
  }
};

/*Client sends token in headers and Server verifies token to identify user */

const register = async (req, res) => {
  const { name, username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(httpStatus.FOUND)
        .json({ message: "User already exist" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    /*Convert a plain text password into a secure hashed password before storing it in the database*/
    /* "10" This is called salt rounds i.e. Number of times hashing algorithm runs internally Higher value = more secure, but slower */
    /*bcrypt.hash() is asynchronous so it Takes time to compute and Returns a Promise that is why we use await*/

    const newUser = new User({
      name: name,
      username: username,
      password: hashedPassword,
    });
    await newUser.save();
    /*Save a document (your user) into MongoDB*/
    /*"save()" returns a promise*/
    res.status(httpStatus.CREATED).json({ message: "User Registered" });
  } catch (e) {
    res.json({ message: `Something went wrong ${e}` });
  }
};

const getUserHistory = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ token: token });
    const meetings = await Meeting.find({ user_id: user.username });
    res.json(meetings);
  } catch (e) {
    res.json({ message: `something went wrong ${e}` });
  }
};

const addToHistory = async (req, res) => {
  const { token, meeting_code } = req.body;

  try {
    const user = await user.findOne({ token: token });

    const newMeeting = new Meeting({
      user_id: user.username,
      meetingCode: meeting_code,
    });

    await newMeeting.save();

    res.status(httpStatus.CREATED).json({ message: "added code to history" });
  } catch (e) {
    res.json({ message: `something went wrong ${e}` });
  }
};

export { login, register, getUserHistory, addToHistory };
