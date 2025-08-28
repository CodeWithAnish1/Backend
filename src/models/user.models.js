import mongoose,{Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
const userSchema= new Schema(
    {
       username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullName:{
            type:String,
            required:true,
            trim:true,
            index:true
        },
        avatar:{
            type:String,//cloudinary
            required:true
        },
        coverImage:{
            type:String,//cloudinary
        },
        watchhistory:[
            {
                type: Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{//bcryprtjs= to hash password 
            type:String,//here encryption is required so password=encrypted-code 
            required:[true,"Password is required"]
        },
        refreshToken:{//jwt =json web token
            type:String,
        }
    },
    {
        timestamps:true 
    }

)
userSchema.pre("save", async function (next) {//here we use the simple function in using middleware not arrow wala
    if(!this.ismodified("password")) return next();
    
    this.password=await bcrypt.hash(this.password,10)
    next()
})
userSchema.methods.isPasswordCorrect= async function (password){
   return await bcrypt.compare(password,this.password)
}
userSchema.methods.generateAccessToken=function(){
    jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullName:this.fullName
    })
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }

}
userSchema.methods.generateRefreshToken=function(){
    jwt.sign({
        _id:this._id,
    })
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
}


export const User = mongoose.model("User",userSchema)