import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens =  async(userId)=>{
    try {
        const user=await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found")
        }
        const accessToken= user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken //stored in database
        await user.save({ validateBeforeSave: false})
        return {accessToken,refreshToken}

    } catch (error) {
        console.log("error",error);
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

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
const loginUser= asyncHandler( async(req,res) =>{
    //req body->data
    //which type of login email or username
    //find the user
    //password check
    //access and refresh token 
    //send cookies

    //1 
    const {email,username,password}=req.body
    console.log(email);
    //2
    if(!username && !email){
        throw new ApiError(400,"Username and email is req")
    }

    //3
    const user=await User.findOne({
        $or:[{email},{username}]
    })
    if(!user){
        throw new ApiError(404,"user does not exist")
    }
    
    //4--> isme user ka u small because ye hamne banaya hai in user.model mai    
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials") 
    }

    //5
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    //6-> if do this then cookies is modified by server only not any outside
    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )
    
})
const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user_id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})
const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefrenceToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefrenceToken){
        throw new ApiError (401,"unauthorised req")
    }
    try {
        const decodedToken=jwt.verify(
            incomingRefrenceToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user=await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError (401,"Invalid Refresh Token")
        }
        if(incomingRefrenceToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message ||"Invalid Refresh Token")
    }

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
} 