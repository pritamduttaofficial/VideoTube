import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { fileUploadCloudinary } from "../utils/cloudinary.js";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findOne(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while token generation");
  }
};

// ------------------ user signup controller ----------------------
const userSignUp = asyncHandler(async (req, res) => {
  // get user data from frontend
  const { username, email, fullname, password } = req.body;

  console.log(req.body);
  // validation - not empty, correct format
  if (!username) {
    throw new ApiError(400, "Username is required");
  }
  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  if (!fullname) {
    throw new ApiError(400, "Fullname is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  // check if user already exist based on either username or email
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "User already exist");
  }

  // Debugging log for req.files
  console.log("Files received:", req.files);

  // check for images if they exist: avatar/coverImage
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  let coverImageLocalPath;
  if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // upload them to cloudinary
  const avatar = await fileUploadCloudinary(avatarLocalPath);
  const coverImage = await fileUploadCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  // create document for the user to store in DB
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullname,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // remove password and refresh token field from response
  const newUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation in DB
  if (!newUser) {
    throw new ApiError(500, "Something went wrong while signup");
  }

  // return response
  return res
    .status(201)
    .json(new ApiResponse(200, newUser, "User Registered Successfully"));
});

// ------------------ user login controller ----------------------
const userLogin = asyncHandler(async (req, res) => {
  // get data from req.body
  const { email, password } = req.body;

  // email validation
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // find the user in database
  const user = await User.findOne({ email });

  // check if user exist
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // password validation
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect Password");
  }
  // generate access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // get the new updated user from DB to send as response
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send tokens to user in cookies
  // const options = {
  //   httpOnly: true,
  //   secure: false,
  // };
  return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", refreshToken)
    .json(new ApiResponse(200, loggedInUser, "Logged In Successfully"));
});

// ------------------ user logout controller ----------------------
const userLogout = asyncHandler(async (req, res) => {
  console.log(req.user);
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // removes the field from document
      },
    },
    {
      new: true,
    }
  );

  // const options = {
  //   httpOnly: true,
  //   secure: false,
  // };
  res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "Logged Out Successfully"));
});

// ------------ controller to refresh the access token when it expires --------------
const refreshAccessToken = asyncHandler(async (req, res) => {
  // get the refresh token from request cookies/header
  const token =
    req.cookies?.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized Access");
  }

  // verify the refreshToken using JWT
  const userPayload = JWT.verify(token, process.env.REFRESH_TOKEN_SECRET);

  // get the user from the id inside the user payload
  const user = await User.findById(userPayload?._id);
  if (!user) {
    throw new ApiError(401, "Invalid Refresh Token");
  }

  // check if the refreshToken present inside DB matches with the user provided token
  if (token !== user?.refreshToken) {
    throw new ApiError(401, "Refresh Token Expired");
  }

  // generate new access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // send tokens to user in cookies
  const options = {
    httpOnly: true,
    secure: false,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {}, "Access Token Refreshed"));
});

// --------------- update user password controller -----------------
const updateUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Confirm Your New Password");
  }

  const user = await User.findById(req.user?._id);

  // check if the oldPassword matches with the user password in DB
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Old Password");
  }

  // update the new password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Updated Successfully"));
});

// ------------------- get the current user ------------------
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched"));
});

// ----------------- update user account details ------------------
const updateUserAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  // validations
  if (email.trim() === "") {
    throw new ApiError(400, "Email is required");
  }
  if (fullname.trim() === "") {
    throw new ApiError(400, "Fullname is required");
  }

  // find the user and update the details
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    {
      new: true, // to return the updated user
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Updated Successfully"));
});

// --------------------- update user avatar ---------------------
const updateUserAvatar = asyncHandler(async (req, res) => {
  // get the file path from req.file using multer middleware
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File Is Required");
  }

  // upload file in cloudinary using the file path
  const avatar = await fileUploadCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(500, "Error while uploading avatar on cloudinary");
  }

  // update the avatar url in the DB with the new url
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

// ------------------- update user coverImage ---------------------
const updateUserCoverImage = asyncHandler(async (req, res) => {
  // get the file path from req.file using multer middleware
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "CoverImage File Is Required");
  }

  // upload file in cloudinary using the file path
  const coverImage = await fileUploadCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(500, "Error while uploading coverImage on cloudinary");
  }

  // update the coverImage url in the DB with the new url
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage Updated Successfully"));
});

// ------------------ get user channel profile -------------------
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Invalid username through url");
  }

  // aggregate pipeline to match a document of the username
  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel.length) {
    throw new ApiError(404, "Channel doesn't exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel Fetched Successfully")
    );
});

// ---------------- add video to user watch history --------------
const addToWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const videoId = req.params.videoId;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  // Add the video to the watch history if it doesn't already exist
  if (!user.watchHistory.includes(videoId)) {
    user.watchHistory.push(videoId);
    await user.save();
  }

  const updatedUser = await User.findById(userId);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser.watchHistory,
        "Video added to watch history"
      )
    );
});

// ------------------- get user watch history -------------------
const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History Fetched Successfully"
      )
    );
});

export {
  userSignUp,
  userLogout,
  userLogin,
  refreshAccessToken,
  updateUserPassword,
  getCurrentUser,
  updateUserAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
  addToWatchHistory,
};
