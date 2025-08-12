import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'

const ConnectDB= async ()=>{
    try {
        const ConnectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB Connected !! DB Host: ${ConnectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDb Connection Error",error);
        process.exit(1)//ye niche ke code ko run hi nhi karne dega matlab terminate kar dega 
    }
}

export default ConnectDB