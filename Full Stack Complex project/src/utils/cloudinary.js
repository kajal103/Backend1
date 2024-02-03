import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null; // agar url nai h tho kuch mat bejo
    //upload the file to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", //UploadApioptions have many thing which we can do if any quarry search on website for example we can give resource_type:"Many_opions"
      folder: "Jay_folders",

    }); //fle has been uploaded successfully
    // console.log("file is uploaded on cloudinary", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //unlinkSync means ye hona hi chiye esliye // this will remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

export { uploadOnCloudinary };