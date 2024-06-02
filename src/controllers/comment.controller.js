import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ------------- get all video comments controller ---------------
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // check if videoId is valid
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  // parse page and limit values to integers
  const pageInt = parseInt(page, 10);
  const limitInt = parseInt(limit, 10);

  // create a pipeline of match stage to get the video comments
  const pipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
  ];

  const options = {
    page: pageInt,
    limit: limitInt,
  };
  // execute aggregatePaginate with pipeline output and options for pagination
  const result = await Comment.aggregatePaginate(
    Comment.aggregate(pipeline),
    options
  );

  if (!result) {
    throw new ApiError(400, "VideoId is invalid");
  }

  // return video comments as response
  return res.status(200).json(
    new ApiResponse(200, {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      totalDocs: result.totalDocs,
      docs: result.docs,
    })
  );
});

// ----------------- add comment controller -------------------
const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;

  // check if videoId is valid
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }
  if (!content) {
    throw new ApiError(400, "Content is required to add comment");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new ApiError(400, "Failed to add comment");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment Added Successfully"));
});

// ---------------- update comment controller ------------------
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  // check if commentId is valid
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }
  if (!content) {
    throw new ApiError(400, "Content is required to update comment");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedComment) {
    throw new ApiError(400, "Comment Updation Failed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment Updated Successfully"));
});

// ---------------- delete comment controller ------------------
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // check if commentId is valid
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment Deleted Successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
