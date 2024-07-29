import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ----------------------- toggle like in videos ---------------------------
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const alreadyLiked = await Like.findOne({ video: videoId, likedBy: userId });

  if (alreadyLiked) {
    await Like.deleteOne({ _id: alreadyLiked._id });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video Unliked successfully"));
  } else {
    const newLike = new Like({ video: videoId, likedBy: userId });
    await newLike.save();
    return res
      .status(200)
      .json(new ApiResponse(200, { liked: true }, "Video Liked successfully"));
  }
});

// ----------------------- toggle like in comments -------------------------
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  // check if commentId is valid
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid CommentId");
  }

  // check if the comment is already liked by user
  const alreadyLiked = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (alreadyLiked) {
    // if comment is already liked, delete the document i.e unlike the comment
    await Like.deleteOne({ _id: alreadyLiked._id });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment Unliked successfully"));
  } else {
    // otherwise create a new document for the like
    const newLike = new Like({
      comment: commentId,
      likedBy: userId,
    });

    // save the newly created document
    await newLike.save();

    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Comment Liked successfully"));
  }
});

// ----------------------- toggle like in tweets -------------------------
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  // check if tweetId is valid
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid TweetId");
  }

  // check if the tweet is already liked by user
  const alreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });

  if (alreadyLiked) {
    // if tweet is already liked, delete the document i.e unlike the tweet
    await Like.deleteOne({ _id: alreadyLiked._id });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Tweet Unliked successfully"));
  } else {
    // otherwise create a new document for the like
    const newLike = new Like({
      tweet: tweetId,
      likedBy: userId,
    });

    // save the newly created document
    await newLike.save();

    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Tweet Liked successfully"));
  }
});

// ---------------------- get all the liked videos ------------------------
const getLikedVideosOfUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const pipeline = [
    // filter the documents where `video` field exists & by userId
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: { $exists: true },
      },
    },
    // left join the `videos` collection with `likes` and store the output as `videoDetails`
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    // deconstruct the `videoDetails` array into individual documents.
    { $unwind: "$videoDetails" },
    {
      $lookup: {
        from: "users",
        localField: "videoDetails.owner",
        foreignField: "_id",
        as: "videoDetails.ownerDetails",
      },
    },
    { $unwind: "$videoDetails.ownerDetails" },
    {
      $addFields: {
        "videoDetails.owner": {
          _id: "$videoDetails.ownerDetails._id",
          fullname: "$videoDetails.ownerDetails.fullname",
          username: "$videoDetails.ownerDetails.username",
          avatar: "$videoDetails.ownerDetails.avatar",
        },
      },
    },
    {
      $project: {
        "videoDetails.ownerDetails": 0,
      },
    },
    // replace the `likes` documents with the `videoDetails` documents to get a better output.
    { $replaceRoot: { newRoot: "$videoDetails" } },
  ];

  // Execute the aggregation pipeline
  const likedVideos = await Like.aggregate(pipeline);

  if (!likedVideos) {
    throw new ApiError(400, "Failed to extract liked videos");
  }

  // return the liked videos as response
  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked Videos Fetched Successfully")
    );
});

// ------------------ get likes count of certain video ---------------------
const getVideoLikesCount = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Check if videoId is valid
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  // Get the count of likes for the video
  const likesCount = await Like.countDocuments({ video: videoId });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { likesCount }, "Likes count retrieved successfully")
    );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideosOfUser,
  getVideoLikesCount,
};
