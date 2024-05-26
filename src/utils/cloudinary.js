import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fileUploadCloudinary = async (filePath) => {
  try {
    if (!filePath) return null;

    // upload file in cloudinary
    const response = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    // remove the file that is locally saved after the file upload is done
    fs.unlinkSync(filePath);
    return response;
  } catch (error) {
    // remove the file that is locally saved after the file upload operation failed
    fs.unlinkSync(filePath);
    return null;
  }
};

export { fileUploadCloudinary };
