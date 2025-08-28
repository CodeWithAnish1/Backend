const asyncHandler = (fn) => async(req,res,next) => {
    try {
        return await fn(req,res,next)
    }
    catch(error){
        return res.status(err.code || 500).json({
            success:false,
            messege:err.messege
        })
    }
}
export {asyncHandler}