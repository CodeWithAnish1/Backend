import ConnectDB from './db/index.js'
import dotenv from 'dotenv'
import { app } from './app.js'
dotenv.config({
    path:'./env'
})

ConnectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000 ,()=>{
        console.log(`Server is running at port : ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MongoDb Connection Failed !!!",err);
})