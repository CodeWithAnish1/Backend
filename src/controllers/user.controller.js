import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser= asyncHandler( async(req,res) =>{
    // 1 get user details from frontend
    // 2 validation- not empty
    // 3 check if user already exist:username,email
    // 4 check for images, check for avatar(multer check for images and avatar)
    // 5 upload them to cloudinary (cloudinary check for avatar)
    // 6 create user object-create-> entry in db 
    // 7 remove password and refresh token 
    // 8 check for user creation 
    // 9 return response

    //1
    const {fullName,email,username,password} =req.body

    //2
    if(
        [fullName,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }

    //3 
    const existedUser=await User.findOne({  //jab bhi user se baat karo await mat bhulna 
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exist")
    }
    console.log(req.files);
    //4
    const avatarLocalPath=req.files?.avatar[0]?.path;//“Agar req.files exist karta hai aur avatar array me at least 1 file hai, to uska path le lo; nahi to undefined.”
    // const coverImageLocalPath=req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }



    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar local file is req")
    }

    //5 

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar upload to Cloudinary failed")
    }
    //6 
    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url ||"",
        email,
        password,
        username:username.toLowerCase()
    })
    //7
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //8
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registring the user")
    }
    //9
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )
    
})

export {registerUser} 