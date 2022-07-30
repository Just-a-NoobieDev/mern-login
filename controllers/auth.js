import asyncHandler from "express-async-handler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";

import User from "../models/UserSchema.js";

export const registerUser = asyncHandler(async (req, res) => {
  //check if error exist from express-validator middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
    });
  }

  const { name, email, pwd } = req.body;

  // check if email is already registered
  const userExist = await User.findOne({ email });
  if (userExist) {
    res.status(409).json({
      error: "User already exist",
    });
  }

  try {
    // encrypt Pass
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(pwd, salt);

    // create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(200).json({ success: `New user ${user._id} created!` });
  } catch (err) {
    res.status(400).json(err.message);
  }
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, pwd } = req.body;

  // check if all fields has value
  if (!email || !pwd) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  // find the user
  const user = await User.findOne({ email }).exec();

  try {
    // decrypt Pass
    const decryptedPass = await bcrypt.compare(pwd, user.password);
    if (!decryptedPass) {
      return res.status(401).json({
        errors: "Invalid email or password",
      });
    }

    const roles = Object.values(user.roles).filter(Boolean);

    // generate access token short term token
    const accessToken = jwt.sign(
      {
        UserInfo: {
          email: user.email,
          name: user.name,
          roles: roles,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "5m",
      }
    );

    // generate Refresh token long term token and store to DB
    const refreshToken = jwt.sign(
      { email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "1d",
      }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({ roles, accessToken });
  } catch (err) {
    res.status(400).json({ message: "Hello" });
  }
});

export const handleRefreshToken = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(401);
  const refreshToken = cookies.jwt;

  const user = await User.findOne({ refreshToken }).exec();
  if (!user) return res.sendStatus(403); //Forbidden
  // evaluate jwt
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err || user.email !== decoded.email) return res.sendStatus(403);
    const accessToken = jwt.sign(
      {
        UserInfo: {
          email: decoded.email,
          name: decoded.name,
          roles: roles,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "10s" }
    );
    res.json({ roles, accessToken });
  });
};

export const logoutUser = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); //No content
  const refreshToken = cookies.jwt;

  const user = await User.findOne({ refreshToken }).exec();
  if (!user) {
    res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
    return res.sendStatus(204);
  }

  user.refreshToken = "";
  const result = await user.save();
  console.log(result);

  res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
  res.sendStatus(204);
};
