import { Router } from "express";
import {
  getLikedVideosOfUser,
  toggleCommentLike,
  toggleVideoLike,
  toggleTweetLike,
  getVideoLikesCount,
} from "../controllers/like.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(authenticateUser); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/videos").get(getLikedVideosOfUser);
router.route("/video/:videoId").get(getVideoLikesCount);

export default router;
