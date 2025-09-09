import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'   //file-system 

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
}); 

const uploadOnCloudinary = async (localfilepath)=>{
    try {
        if(!localfilepath) return null;
        //upload file on the cloudinary 
        const response=await cloudinary.uploader.upload(localfilepath,{
            resource_type:'auto'
        });
        // console.log("File is uploaded on cloudinary",response.url);  //it is for check 
        fs.unlinkSync(localfilepath);
        return response;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        fs.unlinkSync(localfilepath); //remove the locally saved temporary file
        return null;
    }
}

export {uploadOnCloudinary}