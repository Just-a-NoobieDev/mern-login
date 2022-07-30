import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDB from "./config/dbConnection.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import corsOptions from "./config/corsOptions.js";
import credentials from "./middleware/credentials.js";
import verifyJWT from "./middleware/verifyJWT.js";

dotenv.config();

//initialize server
const app = express();
const PORT = process.env.PORT || 3500;

// db connection
connectDB();

// parsing middleware
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api", authRoutes);

app.use(verifyJWT);
app.use("/users", usersRoutes);

// run server
app.listen(PORT, console.log(`Server running in port ${PORT}`));
