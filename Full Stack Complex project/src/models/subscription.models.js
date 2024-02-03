import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //user one who is subcribing
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // one to whom 'subscriber' is subscribing
      ref: "User",
    },
    
  },
  {
    timestamps: true,
  }
);

export const Subcription = mongoose.model("Subcription", subscriptionSchema);
