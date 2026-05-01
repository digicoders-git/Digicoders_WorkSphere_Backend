import mongoose from "mongoose";
import dotenv from "dotenv";
import Role from "../models/RoleSchema.js";
import User from  "../models/UserSchema.js";
import bcrypt from "bcryptjs";
import { permission } from "../config/permission.js";

dotenv.config();

// 🔥 Flatten ALL permissions from config
const getAllPermissions = () => {
  return Object.values(permission)
    .flatMap((module) => Object.values(module));
};

const seed = async () => {
  try {
    // 1. Connect DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // 2. Get all permissions
    const allPermissions = getAllPermissions();

    // 3. Check existing role
    let role = await Role.findOne({ name: "super_admin" });

    if (role) {
      // 🔥 Update existing role
      role.permissions = allPermissions;
      role.companyId = null;
      role.status = true;
      role.isdeleted = false;

      await role.save();

      console.log("✅ Super Admin role updated");
    } else {
      // 🔥 Create new role
      role = new Role({
        name: "super_admin",
        companyId: null,
        permissions: allPermissions,
        status: true,
        isdeleted: false,
      });

      await role.save();

      console.log("✅ Super Admin role created");
    }

    console.log("Total permissions assigned:", allPermissions.length);
    
    let User= await mongoose.model("User").findOne({ email: "superadmin@hrms.com" });
    if (!User) {
      const superAdmin = new (mongoose.model("User"))({
        firstName: "Super",
        lastName: "Admin",
        email: "superadmin@hrms.com",
        password: await bcrypt.hash("superadmin@hrms.com", 10),
        role: role._id,
        companyId: null,
        employeeCode: "SUPER001",
        joiningDate: new Date(),
      });
      await superAdmin.save();
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeder error:", error);
    process.exit(1);
  }
};

seed();