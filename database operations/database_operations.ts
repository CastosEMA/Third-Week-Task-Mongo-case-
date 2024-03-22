import { Employee } from '../employees.js';
import { HolidayRules } from '../holidayRules.js';

import { config } from 'dotenv'
import { format,areIntervalsOverlapping , formatDistance, formatRelative, isValid, isWeekend, eachDayOfInterval, differenceInDays, subDays } from 'date-fns';
import mysql from 'mysql2/promise';
import {RowDataPacket} from 'mysql2/promise';


let failMessage:string;

config();

const MYSQL_IP:string = process.env.MYSQL_IP as string;
const MYSQL_PORT:number = Number(process.env.MYSQL_PORT as string);
const MYSQL_LOGIN:string = process.env.MYSQL_LOGIN as string;
const MYSQL_PASSWORD:string = process.env.MYSQL_PASSWORD as string;
const DB_NAME:string = process.env.DB_NAME as string;

let connection: mysql.Connection;

const initConnection = async () => {
     connection = await mysql.createConnection({
        host: MYSQL_IP,
        port: MYSQL_PORT,
        user: MYSQL_LOGIN,
        password: MYSQL_PASSWORD,
        database: DB_NAME
    });
}
initConnection()

async function checkDates(employeeId:number,startDate:string,endDate:string){
    try {
        const rules = await getRulesRows();
        const periodOfVacation = differenceInDays(endDate,startDate);
        const isHolidayOvarlappingWithBlackoutPeriod = !areIntervalsOverlapping({start:rules[0].blackoutStartDate,end:rules[0].blackoutEndDate},{start:startDate,end:endDate});
        const employee: Employee[] = await getOneEmployee(employeeId);
        
        if(periodOfVacation>0 && differenceInDays(startDate,Date())>0){
            // @ts-ignore
            if(employee[0].remainingHolidays>=periodOfVacation){
                if(isHolidayOvarlappingWithBlackoutPeriod) {
                    if(periodOfVacation<=rules[0].maxConsecutiveDays){
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

async function getOneEmployee(employeeId: number,) {
    try{
    const [neededEmployee] = await connection.execute<RowDataPacket[]>('SELECT * FROM  employees WHERE id = ?',[employeeId]);
    const employee = JSON.parse(JSON.stringify(neededEmployee));
    return employee;
    }catch(err){
        console.log(err);
    }
}

async function getRequestsRows() {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM requests');
    const requestsJson = JSON.parse(JSON.stringify(rows));
    return requestsJson;
}

async function getApprovedOrRejectedRequestsRows() {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM approvedorrejectedholidays');
    const requestsJson = JSON.parse(JSON.stringify(rows));
    return requestsJson;
}

async function getEmployeeRows() {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM  employees');
    const employeesJson = JSON.parse(JSON.stringify(rows));
    return employeesJson;
}

async function getRulesRows() {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM rules');
    const rulesJson:HolidayRules[] = JSON.parse(JSON.stringify(rows));
    return rulesJson;
}

async function deleteRequestById(id:number) {

    try {
        const [result] = await connection.execute('DELETE FROM requests WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error deleting request:', error);
    }
}

async function updateRequest(id: number, startDate: string, endDate: string) {

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isValid(startDateObj) && isValid(endDateObj)) {
        const [employeeIdInArr]: any = await connection.execute("SELECT  employeeId FROM requests WHERE id = ?", [id]);
        const employeeId = employeeIdInArr[0].employeeId;

        if(await checkDates(employeeId, startDate, endDate)){
            try {
                await connection.execute("UPDATE requests SET startDate = ?, endDate = ? WHERE id = ?", [startDate, endDate, id]);
            } catch (err) {
                console.log(err)
            }
        }else{
            console.log('Check dates failed'); //realise popup with res.send
        }
    }
}

async function getDatesOfOneRequest(requestId: number) {
    const [requestDates] = await connection.execute('SELECT startDate, endDate FROM requests WHERE id = ?', [requestId]);
    const requestBouthDates = JSON.parse(JSON.stringify(requestDates));
    const startDate: string = requestBouthDates[0].startDate;
    const endDate: string = requestBouthDates[0].endDate;
    return {startDate, endDate};
}

async function getOneRequest(requestId:number) {
    const request = await connection.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    return request;
}

async function getEmployeeRemainingHolidays(idOfEmployee:number) {
    const [employeeRemainingHolidays] = await connection.execute('SELECT remainingHolidays FROM employees WHERE id = ?', [idOfEmployee]);
    const employeeRemainingHoliday = JSON.parse(JSON.stringify(employeeRemainingHolidays));
    const remainingHolidays = employeeRemainingHoliday[0].remainingHolidays
    return remainingHolidays;
}

async function approveRequest(requestId:number, leftHolidays:number, idOfEmployee:number, startDate:string, endDate:string) {
    await connection.execute('UPDATE requests SET status = ? WHERE id = ?', ['Approved', requestId]);
    await connection.execute('UPDATE employees SET remainingHolidays = ? WHERE id = ?', [leftHolidays, idOfEmployee]);

    const [changedRequest] = await connection.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    const changedParsedRequest = JSON.parse(JSON.stringify(changedRequest));
    const statusOfChangedRequest:string = changedParsedRequest[0].status;

    const sql = 'INSERT INTO approvedorrejectedholidays (employeeId, startDate, endDate, status) VALUES (?, ?, ?, ?)';
    try {
        const [result] = await connection.execute(sql, [idOfEmployee,startDate,endDate,statusOfChangedRequest]);
        console.log('Request added successfully:', result);
    } catch (error) {
        console.error('Error adding request:', error);
    }

    await deleteRequestById(requestId);
}

async function rejectRequest(requestId:number, idOfEmployee:number, startDate:string, endDate:string) {
    await connection.execute('UPDATE requests SET status = ? WHERE id = ?', ['Rejected', requestId]);

    const [changedRequest] = await connection.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    const changedParsedRequest = JSON.parse(JSON.stringify(changedRequest));
    const statusOfChangedRequest:string = changedParsedRequest[0].status;

    const sql = 'INSERT INTO approvedorrejectedholidays (employeeId, startDate, endDate, status) VALUES (?, ?, ?, ?)';
    try {
        const [result] = await connection.execute(sql, [idOfEmployee,startDate,endDate,statusOfChangedRequest]);
        console.log('Request added successfully:', result);
    } catch (error) {
        console.error('Error adding request:', error);
    }

    await deleteRequestById(requestId);
}

async function addOneRequest(employeeId:number, startDate:string, endDate:string) {
    const sql = 'INSERT INTO requests (employeeId, startDate, endDate) VALUES (?, ?, ?)';
    try {
        const [result] = await connection.execute(sql, [employeeId,startDate,endDate]);
        console.log('Request added successfully:', result);
    } catch (error) {
        console.error('Error adding request:', error);
    }
}

export{
    failMessage,
    checkDates,
    getOneEmployee,
    getRequestsRows,
    getApprovedOrRejectedRequestsRows,
    getEmployeeRows,
    getRulesRows,
    deleteRequestById,
    updateRequest,
    getDatesOfOneRequest,
    getOneRequest,
    getEmployeeRemainingHolidays,
    approveRequest,
    rejectRequest,
    addOneRequest
}