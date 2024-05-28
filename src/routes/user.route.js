import { Router } from "express";
import {
  userSignUp,
  userLogin,
  userLogout,
  refreshAccessToken,
  updateUserPassword,
  getCurrentUser,
  updateUserAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/signup").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  userSignUp
);
router.route("/login").post(userLogin);

// secure routes
router.route("/logout").post(authenticateUser, userLogout);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/update-password").post(authenticateUser, updateUserPassword);

router.route("/current-user").get(authenticateUser, getCurrentUser);

router
  .route("/update-account")
  .patch(authenticateUser, updateUserAccountDetails);

router
  .route("/update-avatar")
  .patch(authenticateUser, upload.single("avatar"), updateUserAvatar);

router
  .route("/update-cover-image")
  .patch(authenticateUser, upload.single("coverImage"), updateUserCoverImage);

export default router;
