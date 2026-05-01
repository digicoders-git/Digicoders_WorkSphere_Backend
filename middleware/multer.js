import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from '../utills/cloudinary.js'


const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "digicoders/hrmsv2/",
        // allowed_formats: ["jpg", "jpeg", "png"],
    }
})
const upload = multer({ storage })
export default upload