class ApiError extends Error{
    constructor(
        statusCode,
        message="Something went wrong",
        errors=[],
        stack="" //ye isliye kyuki mujhe kaha kon sa error kon se file mai ayi ye batata hai 
    ){
        super(message)//ye constructor ke message ko call karne ke lia 
        this.statusCode=statusCode
        this.data=null
        this.message=message
        this.success=false
        this.errors=errors

        if(stack){
            this.stack=stack //manually stack dalte hai tab 
        }
        else {
            Error.captureStackTrace(this,this.constructor) //automatically traced
        }

    }
}

export {ApiError}

//Constructor kya hota hai?

//JavaScript (aur classes ke andar) constructor ek special method 
// hota hai jo automatically tab call hota hai jab tum new keyword ke 
// sath class ka object banate ho.
//Ye basically object initialize karne ka kaam karta hai
//  → matlab tum class ke andar jo properties chahte ho (statusCode, message, errors etc.), 
// unko set karne ka default tarika constructor me likhte ho.