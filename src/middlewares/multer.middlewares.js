import multer from "multer"

const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"./public/temp")
    },
    filename:function(req,file,cb){
        cb(null,file.originalname)
    }
})

export const upload=multer({storage})

//  Through Backend (client → server → Cloudinary)

// Agar tum file pehle apne backend server par receive karna chahte ho (Express, Node.js), to uske liye multer use karte ho.

// Multer ka kaam hota hai multipart/form-data (jo browser bhejta hai file upload ke time) ko parse karke tumhe file req.file ya req.files me dena.

// Fir tum us file ko Cloudinary ke SDK (jaise cloudinary.uploader.upload) ke sath Cloudinary par bhej dete ho.