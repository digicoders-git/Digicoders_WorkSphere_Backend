import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
    },
    employeeCode: {
        type: String,
    },
    joiningDate: {
        type: Date
    },
    dateOfBirth: {
        type: Date
    },
    phone: {
        type: String,
    },
    address: {
        type: String,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department"
    },
    designation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Designation"
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role"
    },
    workShift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkShift"
    },
    employmentStatus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmploymentStatus"
    },
    reportingTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }, 
    profilePic: {
        publicId: {
            type: String,
        },
        url: {
        }
    },
    otp: {
        type: String,
    },
    otpExpiry: {
        type: Date,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }

}, { timestamps: true })

const UserModel = mongoose.model("User", UserSchema)
export default UserModel