import mongoose from "mongoose";

const rulesSchema = new mongoose.Schema({
    maxConsecutiveDays: {
        type: Number,
        required: true
    },
    blackoutStartDate: {
        type: String,
        required: true
    },
    blackoutEndDate: {
        type: String,
        required: true
    }
})

export default mongoose.model("rules", rulesSchema);