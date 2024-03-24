import employees from './employeesSchema.js';
import requests from './requestsSchema.js';
import rules from './rulesSchema.js';
import approvedOrRejectedRequests from './approvedOrRejectedRequestsSchema.js';

import {config} from 'dotenv'
import {areIntervalsOverlapping, differenceInDays, isValid} from "date-fns";

import mongoose from 'mongoose';

let failMessage: string;

config()
const dbUrl:string = process.env.MONG_DB_URL as string;
mongoose.connect(dbUrl);

async function autoIncrementation(type: string) {
    if (type === "requests") {
        const existingRequests = await requests.find({});
        const maxId = existingRequests.reduce((max, req) => Math.max(max, req.id || 0), 0);
        const innerId = maxId + 1;
        console.log('innerId', innerId);
        return innerId;
    } else if (type === "appRejRequests") {
        const existingRequests = await approvedOrRejectedRequests.find({});
        const maxId = existingRequests.reduce((max, req) => Math.max(max, req.id || 0), 0);
        const innerId = maxId + 1;
        console.log('innerId', innerId);
        return innerId;
    }
}
async function getOneRequestInMango(idOfRequest:number) {
    try {
        return await requests.findOne({id: idOfRequest});
    } catch (error) {
        console.error('Error occurred while retrieving request from MongoDB:', error);
        throw error;
    }
}


async function getOneEmployeeFromMango(employeeId: number,) {
    try{
        const employee = await employees.find({id: employeeId});
        return employee;
    }catch(err){
        console.log(err);
    }
}

async function getRulesRowsFromMango() {
    const rulesJson = await rules.find({});
    return rulesJson;
}

async function getEmployeeRowsFromMango() {
    const employeesJson = await employees.find({});
    return employeesJson;
}

async function checkDatesFromMango(employeeId:number,startDate:string,endDate:string){
    try {
        const rules = await getRulesRowsFromMango();
        const periodOfVacation = differenceInDays(endDate,startDate);
        const isHolidayOvarlappingWithBlackoutPeriod = !areIntervalsOverlapping({start:rules[0].blackoutStartDate,end:rules[0].blackoutEndDate},{start:startDate,end:endDate});
        const employee = await getOneEmployeeFromMango(employeeId);
        if(periodOfVacation>0 && differenceInDays(startDate,Date())>0){
            // @ts-ignore
            if(employee[0].remainingHolidays>=periodOfVacation){
                console.log("взяв не багато днів");
                if(isHolidayOvarlappingWithBlackoutPeriod) {
                    console.log("не оверлап");
                    if(periodOfVacation<=rules[0].maxConsecutiveDays){
                        console.log("пройшло");
                        return true;
                    } else{
                        failMessage = "You chose too much days for your holiday!!!";
                        return false;
                    }
                }else{
                    failMessage = "There is a Blackout Period in the dates you chose!!!";
                    return false;
                }
            }else{
                failMessage = "You chose too much days for your holiday!!!";
                return false;
            }
        }else{
            failMessage = "You chose the wrong period of holiday!!!";
            return false;
        }

    } catch (error) {
        failMessage = "The date was entered incorrectly!!!";
        return false;
    }

}
async function getRequestsRowsFromMango() {
    try {
        const result = await requests.find({});
        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error getting requests:", error);
        throw error;
    }
}

async function deleteRequestByIdFromMango(id:number) {

    try {
        const result = await requests.deleteOne({id: id});

    } catch (error) {
        console.error('Error deleting request:', error);
    }
}

async function addOneRequestToMango(employeeId: number, startDate: string, endDate: string) {
    try {
        const innerId = await autoIncrementation("requests");
        console.log('innerId' + innerId);
        const newRequest = new requests({
            id:innerId,
            employeeId: employeeId,
            startDate: startDate,
            endDate: endDate,
            status: "Pending"
        });
        const result = await newRequest.save();

        console.log("Request created successfully:", result);
        return result;

    } catch (err) {
        console.error("Error creating request:", err);
        throw err;
    }
}

async function getApprovedOrRejectedRequestsFromMango(){
    try {
        const result = await approvedOrRejectedRequests.find({});
        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error getting ARrequests:", error);
        throw error;
    }
}

async function updateRequestInMongo(id: number, startDate: string, endDate: string) {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isValid(startDateObj) && isValid(endDateObj)) {
        const neededRequest = await requests.findOne({id: id});
        let employeeId: number;
        if(neededRequest){
            employeeId = neededRequest.employeeId;
            if(await checkDatesFromMango(employeeId, startDate, endDate)){
                try {
                    const query = {id: id};
                    await requests.findOneAndUpdate(query, {startDate: startDate, endDate:endDate});
                } catch (err) {
                    console.log(err)
                }
            }else{
                console.log('Check dates failed'); //realise popup with res.send
            }
        }
    }
}

async function approveRequestInMango(id:number, leftHolidays: number, employeeId: number, startDate: string, endDate: string){
    const innerId = await autoIncrementation("appRejRequests");
    console.log(innerId)

    const newApprovedRequest = new approvedOrRejectedRequests({
        id:innerId,
        employeeId: employeeId,
        startDate: startDate,
        endDate: endDate,
        status: "Approved"
    })
    const result = await newApprovedRequest.save();
    await deleteRequestByIdFromMango(id);

    await employees.findOneAndUpdate({id: id}, {remainingHolidays: leftHolidays});

    console.log("Approved Request created successfully:", result);
    return result;
}
async function rejectRequestInMango(id:number, employeeId: number, startDate: string, endDate: string){
    const innerId = await autoIncrementation("appRejRequests");

    const newRejectedRequest = new approvedOrRejectedRequests({
        id:innerId,
        employeeId: employeeId,
        startDate: startDate,
        endDate: endDate,
        status: "Rejected"
    })
    const result = await newRejectedRequest.save();
    await deleteRequestByIdFromMango(id);

    console.log("Rejected Request created successfully:", result);
    return result;
}
async function getDatesOfOneRequestInMongo(requestId: number) {
    try {
        const request = await requests.findOne({ id: requestId }, { startDate: 1, endDate: 1, _id: 0 });
        if (request) {
            const { startDate, endDate } = request;
            return { startDate, endDate };
        } else {
            throw new Error(`Request with id ${requestId} not found`);
        }
    } catch (error) {
        console.error('Error occurred while retrieving request dates from MongoDB:', error);
        throw error;
    }
}
async function getEmployeeRemainingHolidaysFromMango(idOfEmployee: number){
    try {
        const employee = await employees.findOne({ id: idOfEmployee }, { remainingHolidays: 1, _id: 0 });
        if (employee) {
            return employee.remainingHolidays;
        } else {
            throw new Error(`Employee with id ${idOfEmployee} not found`);
        }
    } catch (error) {
        console.error('Error occurred while retrieving employee remaining holidays from MongoDB:', error);
        throw error;
    }
}


export {
    failMessage,
    deleteRequestByIdFromMango,
    checkDatesFromMango,
    getOneRequestInMango,
    getRulesRowsFromMango,
    getEmployeeRowsFromMango,
    getOneEmployeeFromMango,
    addOneRequestToMango,
    getRequestsRowsFromMango,
    getApprovedOrRejectedRequestsFromMango,
    updateRequestInMongo,
    approveRequestInMango,
    rejectRequestInMango,
    getDatesOfOneRequestInMongo,
    getEmployeeRemainingHolidaysFromMango
}