import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asyncHandler.js";
import JWT from "jsonwebtoken";

const authenticateUser = asynchandler(async (req, res, next) => {
  try {
    // get user token_cookie from request or from the `Authorization` header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized Access");
    }

    // token verification
    const userPayload = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // get the user using `_id` present in the payload of token
    const user = await User.findById(userPayload._id).select(
      "-password -refreshToken"
    );

    // check validation of access token
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // passing the `user` object inside the `req` object
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});

export { authenticateUser };
