import express from "express";
import { check } from "express-validator";

import {
  registerUser,
  loginUser,
  logoutUser,
  handleRefreshToken,
} from "../controllers/auth.js";

const router = express.Router();

router.post(
  "/register",
  check("name", "Name should be at least 3 characters").isLength({ min: 3 }),
  check("email", "Email should be valid").isEmail(),
  check("pwd", "Password should be at least 8 characters").isLength({
    min: 8,
  }),
  registerUser
);
router.post("/login", loginUser);
router.get("/refresh", handleRefreshToken);
router.post("/logout", logoutUser);

export default router;
