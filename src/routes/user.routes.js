import { Router } from "express";
import {getUserChannelProfile, 
        getWatchHistory, 
        loginUser, 
        logoutUser, 
        refreshAccessToken, 
        registerUser, 
        updateUserAvatar 
    }from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router()

router.route("/register").post(
    upload.fields(
        [{
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }]
    ),
    registerUser
    )
router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-Password").post(refreshAccessToken)
router.route("/current-user").get(verifyJWT,refreshAccessToken)
router.route("/update-user").patch(verifyJWT,refreshAccessToken)
router.route("/current-user").patch(verifyJWT,refreshAccessToken)
router.route("/update-account").patch(verifyJWT,refreshAccessToken)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserAvatar)
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)  //because in this use params so we take like that
router.route("/history").get(verifyJWT,getWatchHistory)
export default router;