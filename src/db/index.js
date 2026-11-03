import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const [base, query] = process.env.MONGODB_URI.split("?");
    const mongoUri = base.endsWith(`/${DB_NAME}`)
      ? process.env.MONGODB_URI
      : `${base.replace(/\/$/, "")}/${DB_NAME}${query ? `?${query}` : ""}`;

    const connectionInstance = await mongoose.connect(mongoUri);
    console.log(
      `\n MongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB connection error", error);
    process.exit(1);
  }
};

export default connectDB;
