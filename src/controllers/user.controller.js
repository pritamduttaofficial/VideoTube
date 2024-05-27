import { asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { fileUploadCloudinary } from "../utils/cloudinary.js";

// ------------------ user signup controller ----------------------
const userSignUp = asynchandler(async (req, res) => {
  // get user data from frontend
  const { username, email, fullname, password } = req.body;

  // validation - not empty, correct format
  if (username.trim() === "") {
    throw new ApiError(400, "Username is required");
  }
  if (email.trim() === "") {
    throw new ApiError(400, "Email is required");
  }
  if (fullname.trim() === "") {
    throw new ApiError(400, "Fullname is required");
  }
  if (password.trim() === "") {
    throw new ApiError(400, "Password is required");
  }

  // check if user already exist based on either username or email
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "User already exist");
  }

  // check for images if they exist:- avatar/coverImage
  const avatarLocalPath = req.files?.avatar[0]?.path;

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
const userLogin = asynchandler(async (req, res) => {
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
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "Logged In Successfully"));
});

// ------------------ user logout controller ----------------------
const userLogout = asynchandler(async (req, res) => {
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

  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged Out Successfully"));
});

export { userSignUp, userLogout, userLogin };
