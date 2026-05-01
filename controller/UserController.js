import User from "../models/UserSchema.js";
import bcrypt from "bcryptjs";
import cloudinary from "../utills/cloudinary.js";
import { sendMail } from "../utills/SendEmail.js";
import { genrateToken } from "../middleware/authMiddleware.js";
import { loginTemplate, userCreatedTemplate, resetPasswordOtpTemplate } from "../utills/emailTemplates/userTemplate.js";
import EnvData from "../config/EnvData.js";
import { createNotification } from "../utills/notificationHelper.js";

const normalizeDate = (date) => {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
};

export const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, role, gender, employeeCode, joiningDate, dateOfBirth, companyId, department, designation, workShift, employmentStatus, reportingTo } = req.body;
        if (!firstName || !lastName || !email || !phone || !password || !role || !companyId) {
            return res.status(400).json({ message: "All fields are required", success: false });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists", success: false });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ firstName, lastName, email, phone, password: hashedPassword, role, gender, employeeCode, joiningDate: normalizeDate(joiningDate), dateOfBirth: normalizeDate(dateOfBirth), companyId, department, designation, workShift, employmentStatus, reportingTo, createdBy: req.user?.userId || null });
        await user.save();
        res.status(201).json({ message: "User registered successfully", success: true });
        await sendMail({ email, title: "Welcome to HRMS", msg: userCreatedTemplate(user, password) });
        // Welcome notification
        await createNotification({
            userId: user._id,
            title: "Welcome to HRMS! 🎉",
            message: `Hi ${firstName}, your account has been created. Start by checking your profile and attendance.`,
            type: "user",
            link: "/profile",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error registering user", success: false });
    }
};

const generateOTP = () => Math.floor(100000 + Math.random() * 899999).toString();

export const getAllUsersByCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const users = await User.find({ companyId }).select("-password -otp").populate("role", "name").populate("companyId", "name").populate("workShift", "name startTime endTime");
        const totalCount = await User.countDocuments({ companyId });
        res.status(200).json({ users, totalCount, success: true });
    } catch (error) {
        res.status(500).json({ message: "Error fetching users by company", success: false });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password are required", success: false });
        const user = await User.findOne({ email })
            .select("-otp -otpExpiry")
            .populate("role", "name permissions")
            .populate("companyId", "name")
            .populate("workShift", "name startTime endTime");
        if (!user) return res.status(400).json({ message: "Invalid credentials", success: false });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials", success: false });
        if (!user.isActive) return res.status(403).json({ message: "Your account has been disabled. Please contact your administrator.", success: false, blocked: true });
        const token = genrateToken({ userId: user._id, role: user.role.name, company: user?.companyId?._id, permissions: user.role.permissions || [] });
        user.password = undefined;
        res.cookie("token", token, {
            httpOnly: true,
            secure: EnvData.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000,
        }).status(200).json({ user, message: "Login successful", success: true });
        sendMail({ email, title: "Login Successful", msg: loginTemplate(user.firstName) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error logging in", success: false });
    }
};

// POST /api/user/forgot-password  — send OTP to email for password reset
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required", success: false });
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "No account found with this email", success: false });
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await user.save();
        sendMail({ email, title: "Password Reset OTP", msg: resetPasswordOtpTemplate(user.firstName, otp) });
        console.log(`Reset OTP for ${email}: ${otp}`);
        res.status(200).json({ message: "OTP sent to your email", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sending OTP", success: false });
    }
};

// POST /api/user/reset-password  — verify OTP and set new password
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) return res.status(400).json({ message: "Email, OTP and new password are required", success: false });
        if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters", success: false });
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found", success: false });
        if (!user.otp || user.otp !== otp) return res.status(400).json({ message: "Invalid OTP", success: false });
        if (user.otpExpiry < new Date()) return res.status(400).json({ message: "OTP has expired. Please request a new one.", success: false });
        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = null;
        user.otpExpiry = null;
        await user.save();
        res.status(200).json({ message: "Password reset successfully. You can now log in.", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error resetting password", success: false });
    }
};

// PATCH /api/user/:id/change-password  — admin changes any user's password
export const adminChangePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6)
            return res.status(400).json({ message: "New password must be at least 6 characters", success: false });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found", success: false });
        user.password = await bcrypt.hash(newPassword, 10);
        user.updatedBy = req.user.userId;
        await user.save();
        await createNotification({
            userId: user._id,
            title: "Password Changed by Admin",
            message: "Your password has been changed by an administrator. Please log in with your new password.",
            type: "user", link: "/profile", createdBy: req.user.userId,
        });
        res.status(200).json({ message: "Password changed successfully", success: true });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error changing password", success: false });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select("-password -otp")
            .populate("role", "name permissions")
            .populate("companyId", "name")
            .populate("workShift", "name startTime endTime")
            .populate("employmentStatus", "name")
            .populate("reportingTo", "firstName lastName employeeCode profilePic")
            .populate("department", "name");
        if (!user) return res.status(404).json({ message: "User not found", success: false });
        res.status(200).json({ user, success: true });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user profile", success: false });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.userId).select("role companyId").populate("role", "name");
        if (!currentUser) return res.status(404).json({ message: "User not found", success: false });
        if (currentUser?.role?.name === "super_admin") {
            const users = await User.find().select("-password -otp")
                .populate("role", "name").populate("companyId", "name")
                .populate("workShift", "name startTime endTime")
                .populate("employmentStatus", "name")
                .populate("reportingTo", "firstName lastName employeeCode profilePic")
                .populate("createdBy", "firstName lastName")
                .populate("updatedBy", "firstName lastName");
            return res.status(200).json({ users, totalCount: users.length, success: true });
        }
        const users = await User.find({ companyId: currentUser.companyId }).select("-password -otp")
            .populate("role", "name").populate("companyId", "name")
            .populate("workShift", "name startTime endTime")
            .populate("employmentStatus", "name")
            .populate("reportingTo", "firstName lastName employeeCode profilePic")
            .populate("createdBy", "firstName lastName")
            .populate("updatedBy", "firstName lastName");
        return res.status(200).json({ users, totalCount: users.length, success: true });
    } catch (error) {
        console.error("GET USERS ERROR:", error);
        res.status(500).json({ message: "Error fetching users", success: false });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone, password, gender, employeeCode, joiningDate, dateOfBirth, department, designation, workShift, employmentStatus, reportingTo } = req.body;
        const profilePic = req.file ? { url: req.file.path, publicId: req.file.filename } : null;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found", success: false });

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;
        if (gender) user.gender = gender;
        if (employeeCode) user.employeeCode = employeeCode;
        if (joiningDate) user.joiningDate = normalizeDate(joiningDate);
        if (dateOfBirth) user.dateOfBirth = normalizeDate(dateOfBirth);
        if (department) user.department = department;
        if (designation) user.designation = designation;
        if (workShift) user.workShift = workShift;
        if (employmentStatus) user.employmentStatus = employmentStatus;
        if (reportingTo) user.reportingTo = reportingTo;
        if (password) user.password = await bcrypt.hash(password, 10);
        if (profilePic) {
            if (user.profilePic?.publicId) await cloudinary.uploader.destroy(user.profilePic.publicId);
            user.profilePic = { url: profilePic.url, publicId: profilePic.publicId };
        }
        await user.save();
        // Send notification before response so any error is caught
        await createNotification({
            userId: req.user.userId,
            title: "Profile Updated",
            message: "Your profile information has been updated successfully.",
            type: "user",
            link: "/profile",
            createdBy: req.user.userId,
        });
        res.status(200).json({ message: "Profile updated successfully", success: true });
    } catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);
        res.status(500).json({ message: error.message || "Error updating profile", success: false });
    }
};

export const adminUpdateUser = async (req, res) => {
    try {
        const { firstName, lastName, phone, role, gender, employeeCode, joiningDate, dateOfBirth, companyId, workShift, reportingTo, employmentStatus, department, designation } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found", success: false });

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;
        if (role) user.role = role;
        if (gender) user.gender = gender;
        if (employeeCode) user.employeeCode = employeeCode;
        if (companyId) user.companyId = companyId;
        if (workShift) user.workShift = workShift;
        if (employmentStatus) user.employmentStatus = employmentStatus;
        if (department) user.department = department;
        if (designation) user.designation = designation;
        if (reportingTo !== undefined) user.reportingTo = reportingTo || null;
        if (joiningDate) user.joiningDate = normalizeDate(joiningDate);
        if (dateOfBirth) user.dateOfBirth = normalizeDate(dateOfBirth);
        user.updatedBy = req.user.userId;
        await user.save();
        res.status(200).json({ message: "User updated successfully", success: true });
        await createNotification({
            userId: user._id,
            title: "Your Profile Was Updated",
            message: "An administrator has updated your account details.",
            type: "user",
            link: "/profile",
            createdBy: req.user.userId,
        });
    } catch (error) {
        console.error("ADMIN UPDATE USER ERROR:", error);
        res.status(500).json({ message: error.message || "Error updating user", success: false });
    }
};

export const verifyToken = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select("-password -otp")
            .populate("role", "name permissions")
            .populate("companyId", "name")
            .populate("workShift", "name startTime endTime")
            .populate("employmentStatus", "name")
            .populate("reportingTo", "firstName lastName employeeCode profilePic");
        if (!user) return res.status(404).json({ message: "User not found", success: false });
        res.status(200).json({ user, success: true });
    } catch (error) {
        res.status(500).json({ message: "Error verifying token", success: false });
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found", success: false });
        if (user._id.toString() === req.user.userId) return res.status(400).json({ message: "Cannot disable your own account", success: false });
        user.isActive = !user.isActive;
        user.updatedBy = req.user.userId;
        await user.save();
        await createNotification({
            userId: user._id,
            title: user.isActive ? "Account Activated" : "Account Disabled",
            message: user.isActive
                ? "Your account has been activated. You can now log in."
                : "Your account has been disabled by an administrator. Contact your admin for access.",
            type: "user",
            link: "/",
            createdBy: req.user.userId,
        });
        res.status(200).json({ message: `User ${user.isActive ? "activated" : "disabled"} successfully`, isActive: user.isActive, success: true });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error toggling user status", success: false });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ message: "Current and new password are required", success: false });
        if (newPassword.length < 6)
            return res.status(400).json({ message: "New password must be at least 6 characters", success: false });

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found", success: false });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Current password is incorrect", success: false });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        await createNotification({
            userId: user._id,
            title: "Password Changed",
            message: "Your password was changed successfully. If this wasn't you, contact your administrator.",
            type: "user",
            link: "/profile",
            createdBy: req.user.userId,
        });

        res.status(200).json({ message: "Password changed successfully", success: true });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error changing password", success: false });
    }
};

export const logoutUser = async (req, res) => {
    try {
        res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
        return res.status(200).json({ message: "Logged out successfully", success: true });
    } catch (error) {
        res.status(500).json({ message: "Error logging out", success: false });
    }
};
