import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ------------------------ toggle channel subscription ---------------------------
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid ChannelId");
  }

  const existingSubscriber = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user?._id,
  });

  if (existingSubscriber) {
    await Subscription.deleteOne({ _id: existingSubscriber._id });
    return res.status(200).json(new ApiResponse(200, "Channel Unsubscribed"));
  } else {
    const newSubscription = await Subscription.create({
      channel: channelId,
      subscriber: req.user?._id,
    });

    if (!newSubscription) {
      throw new ApiError(400, "Channel Not Found || Something Went Wrong");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, newSubscription, "Channel Subscribed"));
  }
});

// ---------------------- get the subscribers of a channel ------------------------
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid ChannelId");
  }

  const pipeline = [
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "channelSubscribers",
      },
    },
    { $unwind: "$channelSubscribers" },
    { $replaceRoot: { newRoot: "$channelSubscribers" } },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ];

  const subscribers = await Subscription.aggregate(pipeline);

  if (!subscribers) {
    throw new ApiError(400, "Something went wrong while fetching subscribers");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "Channel Subscribers Fetched Successfully"
      )
    );
});

// -------------------- get the channels an user has subscribed -------------------
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid SubscriberId");
  }

  const pipeline = [
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannels",
      },
    },
    { $unwind: "$subscribedChannels" },
    { $replaceRoot: { newRoot: "$subscribedChannels" } },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ];

  const channels = await Subscription.aggregate(pipeline);

  if (!channels) {
    throw new ApiError(
      400,
      "Something went wrong while fetching subscribed channels"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channels, "Subscribed Channels Fetched Successfully")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
