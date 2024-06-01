import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fileUploadCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

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

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
