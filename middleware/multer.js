import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from '../utills/cloudinary.js'


const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "digicoders/hrmsv2/",
        resource_type: "auto",
        public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
    }),
})
const upload = multer({ storage })
export default upload