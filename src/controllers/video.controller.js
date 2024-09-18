import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fileUploadCloudinary } from "../utils/cloudinary.js";

// --------------- get all videos based on query ------------------
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  // Convert page and limit to integers to avoid any issues with string inputs
  const pageInt = parseInt(page, 10);
  const limitInt = parseInt(limit, 10);

  // `match` stage of the aggregation pipeline for filtering based on text search or video owner
  const matchStage = {};
  if (query) {
    matchStage.$text = { $search: query };
  }
  if (userId) {
    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }

  // `sort` stage aggregation pipeline
  const sortStage = {};
  sortStage[sortBy] = sortType === "asc" ? 1 : -1;

  // Create the aggregation pipeline for match and sort
  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    { $sort: sortStage },
  ];

  // Use aggregatePaginate for pagination
  const options = {
    page: pageInt,
    limit: limitInt,
  };

  const result = await Video.aggregatePaginate(
    Video.aggregate(pipeline),
    options
  );

  // Send response
  res.status(200).json(
    new ApiResponse(
      200,
      {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalDocs: result.totalDocs,
        docs: result.docs,
      },
      "Videos Fetched Successfully"
    )
  );
});

// --------------------- publish a video  -------------------
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // validation for title & description
  if (!title) {
    throw new ApiError(400, "Video title is required");
  }
  if (!description) {
    throw new ApiError(400, "Video description is required");
  }

  // get the video and thumbnail path from req.files
  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  // check if they are present
  if (!videoLocalPath) {
    throw new ApiError(400, "Video File is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  // upload them to cloudinary
  const videoFile = await fileUploadCloudinary(videoLocalPath);
  const thumbnail = await fileUploadCloudinary(thumbnailLocalPath);

  // verify if it is successfully uploaded
  if (!videoFile) {
    throw new ApiError(400, "Video File is required");
  }
  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail is required");
  }

  // create a video document with the provided data
  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration,
    owner: req.user?._id,
  });

  // return response to user
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Published Successfully"));
});

// --------------------- get video by id --------------------
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // check if videoId is valid
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  // find the video in db and check if it exist
  const video = await Video.findById(videoId).populate("owner");

  if (!video) {
    throw new ApiError(400, "Video does not exist");
  }

  // send the video as response
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

// ---------------------- update video -----------------------
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  // check if videoId is valid
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  // validate if they exist
  if (!title) {
    throw new ApiError(400, "Video title is required");
  }
  if (!description) {
    throw new ApiError(400, "Video description is required");
  }

  // get the local path of thumbnail form multer using req.file
  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Video thumbnail is required");
  }

  // upload thumbnail to cloudinary and check if it is uploaded successfully
  const thumbnail = await fileUploadCloudinary(thumbnailLocalPath);
  if (!thumbnail.url) {
    throw new ApiError(500, "Error while uploading thumbnail on cloudinary");
  }

  // update the video document with the data provided
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url,
      },
    },
    {
      new: true,
    }
  );

  // check if video was updated successfully
  if (!updatedVideo) {
    throw new ApiError(400, "Video updation failure");
  }

  // send the updated video as response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video Updated Successfully"));
});

// ---------------------- delete video -----------------------
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // check if videoId is valid
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  await Video.findByIdAndDelete(videoId);
  return res
    .status(200)
    .json(new ApiResponse(200, "Video Deleted Successfully"));
});

// ------------------ toggle isPublic status -------------------
const toggleIsPublicStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // check if videoId is valid
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  // get the required video
  const video = await Video.findById(videoId);

  // change the value of isPublic to true or false based on it's prev value
  video.isPublic = !video.isPublic;

  // save the document after updation
  await video.save();

  // return response
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video toggled Successfully"));
});

// -------------------- update view count ----------------------
const updateViewCount = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  video.views += 1;
  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "View count updated"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  toggleIsPublicStatus,
  updateViewCount,
};
