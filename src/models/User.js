import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

const { Schema, model, models } = mongoose;

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

    // Administrative account status, distinct from the presence `status` above.
    // Controls whether the account can log in; history/data is kept regardless.
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "inactive", "deceased"],
      default: "active",
    },

    role: {
      type: String,
      enum: ["player", "admin"],
      default: "player",
    },
    // Global, admin-granted capability: may this subscriber create their own
    // tournaments (subject to admin approval before going public)? Kept as
    // its own field rather than a new `role` enum value -- role changes go
    // through /api/users/[id]/role, which has its own separately-maintained
    // allowed-values list that already drifts from this schema's enum.
    canCreateTournaments: { type: Boolean, default: false },
    // Which admin/organizer created this account on someone else's behalf
    // (e.g. via Register Player, Import Users, or the admin Create User
    // form) -- null for a public self-signup. Backs the restricted user
    // directory: a promoted director can see users they personally added.
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    subCity: {
      type: String,
    },
    // 2-digit geographic region classification code (see constants/regions.js).
    // Drives team-number assignment and the round-1 same-region seating rule.
    region: {
      type: String,
      default: "00",
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
