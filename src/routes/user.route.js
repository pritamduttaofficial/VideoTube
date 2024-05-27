import { Router } from "express";
import {
  userSignUp,
  userLogin,
  userLogout,
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

export default router;
