import mongoose from "mongoose";

const requestsSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
    },
    employeeId: {
        type: Number,
        required: true,
    },
    startDate: {
        type: String,
        required: true,
    },
    endDate: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
});


export default mongoose.model("requests", requestsSchema);
