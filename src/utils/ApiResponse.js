class ApiResponse{
    constructor(statusCode,data,messege="success"){
        this.statusCode=statusCode,
        this.data=data,
        this.message=message,
        this.success=statusCode < 400//different different response limit 
    }
}
export {ApiResponse}