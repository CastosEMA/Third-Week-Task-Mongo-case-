import mongoose from "mongoose";

const employeesSchema = new mongoose.Schema({
    id:{
        type: Number,
        required: true
    },
    name: {
        type:String,
        required:true
    },
    remainingHolidays: {
        type:Number,
        required:true
    }
})

export default mongoose.model("employees", employeesSchema);