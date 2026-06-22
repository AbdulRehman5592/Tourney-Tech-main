import { Schema, model, models } from "mongoose";

const BankDetailsSchema = new Schema(
  {
    bankName: {
      type: String,
      required: true,
    },
    accountHolder: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export const BankDetails =
  models.BankDetails || model("BankDetails", BankDetailsSchema);
