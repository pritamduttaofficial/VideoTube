import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ---------------------- get the channel details -----------------------
const getChannelStats = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid ChannelId");
  }

  // Total number of subscribers
  const subscriberCount = await Subscription.countDocuments({
    channel: channelId,
  });

  // Total number of videos
  const videoCount = await Video.countDocuments({ owner: channelId });

  // Aggregate pipeline for total views
  const viewsPipeline = [
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
      },
    },
  ];
  const viewStats = await Video.aggregate(viewsPipeline);

  // Aggregate pipeline for total likes
  const likesPipeline = [
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    { $unwind: "$likes" },
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: 1,
        },
      },
    },
  ];
  const likeStats = await Video.aggregate(likesPipeline);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalSubscribers: subscriberCount,
        totalVideos: videoCount,
        totalViews: viewStats[0].totalViews,
        totalLikes: likeStats[0].totalLikes,
      },
      "Channel Stats Fetched Successfully"
    )
  );
});

// ----------------------- get the channel videos -----------------------
const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid ChannelId");
  }

  const videos = await Video.find({ owner: channelId });

  if (!videos.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Channel has no videos"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel Videos Fetched Successfully"));
});

export { getChannelStats, getChannelVideos };
