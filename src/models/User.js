import { Schema, model, models } from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const UserSchema = new Schema(
  {
    registrationId: { type: String },

    firstname: {
      type: String,
      required: [true, "First name is required."],
    },

    lastname: {
      type: String,
      required: [true, "Last name is required."],
    },

    avatar: {
      type: String,
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },

    username: {
      type: String,
      required: [true, "Username is required."],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },

    password: {
      type: String,
      // required: [true, "Password is required."],
    },

    phone: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\+?\d{10,15}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
      unique: true,
      sparse: true, // Allows multiple users without phone numbers
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    city: {
      type: String,
      required: [true, "City is required."],
    },

    stateCode: {
      type: String,
      required: [true, "State code is required."],
    },

    // Rohan replace this

    // dob: {
    //   type: Date,
    //   validate: {
    //     validator: function (value) {
    //       return value <= new Date();
    //     },
    //     message: "Date of birth cannot be in the future.",
    //   },
    //   required: [true, "DOB is required."],
    // },
    dob: {
      type: String,
      required: [true, "DOB is required."],
      match: [
        /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/,
        "Invalid date format (MM/DD).",
      ],
    },

    refreshToken: { type: String },

    status: {
      type: String,
      enum: ["online", "offline", "idle"],
      default: "offline",
    },

    role: {
      type: String,
      enum: ["player", "admin"],
      default: "player",
    },
    subCity: {
      type: String,
    },
    club: {
      type: String,
    },
    isVerified: { type: Boolean, default: false },
    otp: { type: Number },
    otpExpiry: { type: Date },
  },
  { timestamps: true }
);

// Password hashing before saving user
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare plain password with hashed password
UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// 🧠 Prevent model overwrite in development
export const User = models.User || model("User", UserSchema);
