import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

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
const changeCurrentPassword= asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword}=req.body
    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password")
    }
    user.password=password
    await user.save({validateBeforeSave: false })
    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Password Change Successfully")
    )
})
const getCurrentUser= asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"Current user fetched Successfully")
})
const updateAccountDetails= asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body
    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set :{
                fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,user,"Account details updated Successfully"
        )
    )
})
const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath= req.file?.path  //yahs file liya kyuki mujhe single file upload karwana hai usme avatar and coverimage dono fields tha so files le rhe the 
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is Missing")
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading Avatar")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar Image Successfully")
    )
})
const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath= req.file?.path  //yahs file liya kyuki mujhe single file upload karwana hai usme avatar and coverimage dono fields tha so files le rhe the 
    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage File is Missing")
    }
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading coverImage")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover Image Successfully")
    )
})
const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params
    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }
    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",//subscription model ka export mai plural use karke likha
                localfield:"_id",
                foreignField:"channel",//channel kitne logo ne subscribe kiya 
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions", 
                localfield:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{//means kis kis ko frontend mai show karoge uske flag 1 karo
                fullName:1,
                username:1,
                email:1,
                subscribersCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
            }
        }

    ])
    if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched Successfully")
    )
})
const getWatchHistory=asyncHandler( async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id) //because mongoose mai string mai id aa jata hai so isse new mongoose karke original format mai lana parta hai 
            }
        },
        {
            $lookup:{
                from:"videos",//kaha pe lookup kar rhe ho mai user se videos wale section mai lookup kar rha
                localField:"watchHistory",//so userschema ka watchHistory lenge usme do uske id rhega, ek video collection ka(ex:105 id) aur ek jisse connect kar raha uska like owner id(ex:5 id)
                foreignField:"_id",//ye user ka id(ex:5) hai (yhi match karega) 
                //aur milte hi user ka sab kuchhh ek array mai band hokar connect with videoscollection
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localfield:"owner",//(ye videosschema mai hoga)
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {//it is for giving the first value ya object for frontend engineer
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watchHistory fetched successfully"
        )
    )
})
export {
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} 