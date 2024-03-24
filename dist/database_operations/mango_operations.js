var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import employees from './employeesSchema.js';
import requests from './requestsSchema.js';
import rules from './rulesSchema.js';
import approvedOrRejectedRequests from './approvedOrRejectedRequestsSchema.js';
import { config } from 'dotenv';
import { areIntervalsOverlapping, differenceInDays, isValid } from "date-fns";
import mongoose from 'mongoose';
let failMessage;
config();
const dbUrl = process.env.MONG_DB_URL;
mongoose.connect(dbUrl);
function autoIncrementation(type) {
    return __awaiter(this, void 0, void 0, function* () {
        if (type === "requests") {
            const existingRequests = yield requests.find({});
            const maxId = existingRequests.reduce((max, req) => Math.max(max, req.id || 0), 0);
            const innerId = maxId + 1;
            console.log('innerId', innerId);
            return innerId;
        }
        else if (type === "appRejRequests") {
            const existingRequests = yield approvedOrRejectedRequests.find({});
            const maxId = existingRequests.reduce((max, req) => Math.max(max, req.id || 0), 0);
            const innerId = maxId + 1;
            console.log('innerId', innerId);
            return innerId;
        }
    });
}
function getOneRequestInMango(idOfRequest) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield requests.findOne({ id: idOfRequest });
        }
        catch (error) {
            console.error('Error occurred while retrieving request from MongoDB:', error);
            throw error;
        }
    });
}
function getOneEmployeeFromMango(employeeId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const employee = yield employees.find({ id: employeeId });
            return employee;
        }
        catch (err) {
            console.log(err);
        }
    });
}
function getRulesRowsFromMango() {
    return __awaiter(this, void 0, void 0, function* () {
        const rulesJson = yield rules.find({});
        return rulesJson;
    });
}
function getEmployeeRowsFromMango() {
    return __awaiter(this, void 0, void 0, function* () {
        const employeesJson = yield employees.find({});
        return employeesJson;
    });
}
function checkDatesFromMango(employeeId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const rules = yield getRulesRowsFromMango();
            const periodOfVacation = differenceInDays(endDate, startDate);
            const isHolidayOvarlappingWithBlackoutPeriod = !areIntervalsOverlapping({ start: rules[0].blackoutStartDate, end: rules[0].blackoutEndDate }, { start: startDate, end: endDate });
            const employee = yield getOneEmployeeFromMango(employeeId);
            if (periodOfVacation > 0 && differenceInDays(startDate, Date()) > 0) {
                // @ts-ignore
                if (employee[0].remainingHolidays >= periodOfVacation) {
                    console.log("взяв не багато днів");
                    if (isHolidayOvarlappingWithBlackoutPeriod) {
                        console.log("не оверлап");
                        if (periodOfVacation <= rules[0].maxConsecutiveDays) {
                            console.log("пройшло");
                            return true;
                        }
                        else {
                            failMessage = "You chose too much days for your holiday!!!";
                            return false;
                        }
                    }
                    else {
                        failMessage = "There is a Blackout Period in the dates you chose!!!";
                        return false;
                    }
                }
                else {
                    failMessage = "You chose too much days for your holiday!!!";
                    return false;
                }
            }
            else {
                failMessage = "You chose the wrong period of holiday!!!";
                return false;
            }
        }
        catch (error) {
            failMessage = "The date was entered incorrectly!!!";
            return false;
        }
    });
}
function getRequestsRowsFromMango() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield requests.find({});
            return JSON.parse(JSON.stringify(result));
        }
        catch (error) {
            console.error("Error getting requests:", error);
            throw error;
        }
    });
}
function deleteRequestByIdFromMango(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield requests.deleteOne({ id: id });
        }
        catch (error) {
            console.error('Error deleting request:', error);
        }
    });
}
function addOneRequestToMango(employeeId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const innerId = yield autoIncrementation("requests");
            console.log('innerId' + innerId);
            const newRequest = new requests({
                id: innerId,
                employeeId: employeeId,
                startDate: startDate,
                endDate: endDate,
                status: "Pending"
            });
            const result = yield newRequest.save();
            console.log("Request created successfully:", result);
            return result;
        }
        catch (err) {
            console.error("Error creating request:", err);
            throw err;
        }
    });
}
function getApprovedOrRejectedRequestsFromMango() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield approvedOrRejectedRequests.find({});
            return JSON.parse(JSON.stringify(result));
        }
        catch (error) {
            console.error("Error getting ARrequests:", error);
            throw error;
        }
    });
}
function updateRequestInMongo(id, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        if (isValid(startDateObj) && isValid(endDateObj)) {
            const neededRequest = yield requests.findOne({ id: id });
            let employeeId;
            if (neededRequest) {
                employeeId = neededRequest.employeeId;
                if (yield checkDatesFromMango(employeeId, startDate, endDate)) {
                    try {
                        const query = { id: id };
                        yield requests.findOneAndUpdate(query, { startDate: startDate, endDate: endDate });
                    }
                    catch (err) {
                        console.log(err);
                    }
                }
                else {
                    console.log('Check dates failed'); //realise popup with res.send
                }
            }
        }
    });
}
function approveRequestInMango(id, leftHolidays, employeeId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const innerId = yield autoIncrementation("appRejRequests");
        console.log(innerId);
        const newApprovedRequest = new approvedOrRejectedRequests({
            id: innerId,
            employeeId: employeeId,
            startDate: startDate,
            endDate: endDate,
            status: "Approved"
        });
        const result = yield newApprovedRequest.save();
        yield deleteRequestByIdFromMango(id);
        yield employees.findOneAndUpdate({ id: id }, { remainingHolidays: leftHolidays });
        console.log("Approved Request created successfully:", result);
        return result;
    });
}
function rejectRequestInMango(id, employeeId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const innerId = yield autoIncrementation("appRejRequests");
        const newRejectedRequest = new approvedOrRejectedRequests({
            id: innerId,
            employeeId: employeeId,
            startDate: startDate,
            endDate: endDate,
            status: "Rejected"
        });
        const result = yield newRejectedRequest.save();
        yield deleteRequestByIdFromMango(id);
        console.log("Rejected Request created successfully:", result);
        return result;
    });
}
function getDatesOfOneRequestInMongo(requestId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const request = yield requests.findOne({ id: requestId }, { startDate: 1, endDate: 1, _id: 0 });
            if (request) {
                const { startDate, endDate } = request;
                return { startDate, endDate };
            }
            else {
                throw new Error(`Request with id ${requestId} not found`);
            }
        }
        catch (error) {
            console.error('Error occurred while retrieving request dates from MongoDB:', error);
            throw error;
        }
    });
}
function getEmployeeRemainingHolidaysFromMango(idOfEmployee) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const employee = yield employees.findOne({ id: idOfEmployee }, { remainingHolidays: 1, _id: 0 });
            if (employee) {
                return employee.remainingHolidays;
            }
            else {
                throw new Error(`Employee with id ${idOfEmployee} not found`);
            }
        }
        catch (error) {
            console.error('Error occurred while retrieving employee remaining holidays from MongoDB:', error);
            throw error;
        }
    });
}
export { failMessage, deleteRequestByIdFromMango, checkDatesFromMango, getOneRequestInMango, getRulesRowsFromMango, getEmployeeRowsFromMango, getOneEmployeeFromMango, addOneRequestToMango, getRequestsRowsFromMango, getApprovedOrRejectedRequestsFromMango, updateRequestInMongo, approveRequestInMango, rejectRequestInMango, getDatesOfOneRequestInMongo, getEmployeeRemainingHolidaysFromMango };
