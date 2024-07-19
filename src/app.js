import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// middlewares
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, // This allows cookies to be sent
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes import
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";

//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/dashboard", dashboardRouter);

app.use(errorHandler);

export { app };

/* 
  1. The errorHandler middleware you've defined can handle errors thrown by your controller or any middleware in your Express application.
  2. To use this `errorHandler` middleware in your Express app, it must be defined after all routes.

  ** How It Handles Controller Errors:-
  -> When an error occurs within your controller (or any middleware), you can throw an instance of `ApiError` by doing `throw new ApiError()`.
  -> When `next(error)` is called within your `asyncHandler's` `catch` block, Express will pass the error to the `errorHandler` middleware you've defined. The `errorHandler` will then respond with a JSON object containing the appropriate status code and error message.
  -> `errorHandler` middleware is well-suited to handle errors thrown by your controller functions or any middleware in your Express application. It helps in centralizing error handling logic and providing consistent error responses to clients, which is crucial for maintaining a robust and reliable API.
*/
