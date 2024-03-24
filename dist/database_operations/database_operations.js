var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { config } from 'dotenv';
import { areIntervalsOverlapping, isValid, differenceInDays } from 'date-fns';
import mysql from 'mysql2/promise';
let failMessage;
config();
const MYSQL_IP = process.env.MYSQL_IP;
const MYSQL_PORT = Number(process.env.MYSQL_PORT);
const MYSQL_LOGIN = process.env.MYSQL_LOGIN;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const DB_NAME = process.env.DB_NAME;
let connection;
const initConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    connection = yield mysql.createConnection({
        host: MYSQL_IP,
        port: MYSQL_PORT,
        user: MYSQL_LOGIN,
        password: MYSQL_PASSWORD,
        database: DB_NAME
    });
});
initConnection();
function checkDates(employeeId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const rules = yield getRulesRows();
            const periodOfVacation = differenceInDays(endDate, startDate);
            const isHolidayOvarlappingWithBlackoutPeriod = !areIntervalsOverlapping({ start: rules[0].blackoutStartDate, end: rules[0].blackoutEndDate }, { start: startDate, end: endDate });
            const employee = yield getOneEmployee(employeeId);
            if (periodOfVacation > 0 && differenceInDays(startDate, Date()) > 0) {
                // @ts-ignore
                if (employee[0].remainingHolidays >= periodOfVacation) {
                    if (isHolidayOvarlappingWithBlackoutPeriod) {
                        if (periodOfVacation <= rules[0].maxConsecutiveDays) {
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
function getOneEmployee(employeeId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [neededEmployee] = yield connection.execute('SELECT * FROM  employees WHERE id = ?', [employeeId]);
            const employee = JSON.parse(JSON.stringify(neededEmployee));
            return employee;
        }
        catch (err) {
            console.log(err);
        }
    });
}
function getRequestsRows() {
    return __awaiter(this, void 0, void 0, function* () {
        const [rows] = yield connection.execute('SELECT * FROM requests');
        const requestsJson = JSON.parse(JSON.stringify(rows));
        return requestsJson;
    });
}
function getApprovedOrRejectedRequestsRows() {
    return __awaiter(this, void 0, void 0, function* () {
        const [rows] = yield connection.execute('SELECT * FROM approvedorrejectedholidays');
        const requestsJson = JSON.parse(JSON.stringify(rows));
        return requestsJson;
    });
}
function getEmployeeRows() {
    return __awaiter(this, void 0, void 0, function* () {
        const [rows] = yield connection.execute('SELECT * FROM  employees');
        const employeesJson = JSON.parse(JSON.stringify(rows));
        return employeesJson;
    });
}
function getRulesRows() {
    return __awaiter(this, void 0, void 0, function* () {
        const [rows] = yield connection.execute('SELECT * FROM rules');
        const rulesJson = JSON.parse(JSON.stringify(rows));
        return rulesJson;
    });
}
function deleteRequestById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [result] = yield connection.execute('DELETE FROM requests WHERE id = ?', [id]);
        }
        catch (error) {
            console.error('Error deleting request:', error);
        }
    });
}
function updateRequest(id, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        if (isValid(startDateObj) && isValid(endDateObj)) {
            const [employeeIdInArr] = yield connection.execute("SELECT  employeeId FROM requests WHERE id = ?", [id]);
            const employeeId = employeeIdInArr[0].employeeId;
            if (yield checkDates(employeeId, startDate, endDate)) {
                try {
                    yield connection.execute("UPDATE requests SET startDate = ?, endDate = ? WHERE id = ?", [startDate, endDate, id]);
                }
                catch (err) {
                    console.log(err);
                }
            }
            else {
                console.log('Check dates failed'); //realise popup with res.send
            }
        }
    });
}
function getDatesOfOneRequest(requestId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [requestDates] = yield connection.execute('SELECT startDate, endDate FROM requests WHERE id = ?', [requestId]);
        const requestBouthDates = JSON.parse(JSON.stringify(requestDates));
        const startDate = requestBouthDates[0].startDate;
        const endDate = requestBouthDates[0].endDate;
        return { startDate, endDate };
    });
}
function getOneRequest(requestId) {
    return __awaiter(this, void 0, void 0, function* () {
        const request = yield connection.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
        return request;
    });
}
function getEmployeeRemainingHolidays(idOfEmployee) {
    return __awaiter(this, void 0, void 0, function* () {
        const [employeeRemainingHolidays] = yield connection.execute('SELECT remainingHolidays FROM employees WHERE id = ?', [idOfEmployee]);
        const employeeRemainingHoliday = JSON.parse(JSON.stringify(employeeRemainingHolidays));
        const remainingHolidays = employeeRemainingHoliday[0].remainingHolidays;
        return remainingHolidays;
    });
}
function approveRequest(requestId, leftHolidays, idOfEmployee, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        yield connection.execute('UPDATE requests SET status = ? WHERE id = ?', ['Approved', requestId]);
        yield connection.execute('UPDATE employees SET remainingHolidays = ? WHERE id = ?', [leftHolidays, idOfEmployee]);
        const [changedRequest] = yield connection.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
        const changedParsedRequest = JSON.parse(JSON.stringify(changedRequest));
        const statusOfChangedRequest = changedParsedRequest[0].status;
        const sql = 'INSERT INTO approvedorrejectedholidays (employeeId, startDate, endDate, status) VALUES (?, ?, ?, ?)';
        try {
            const [result] = yield connection.execute(sql, [idOfEmployee, startDate, endDate, statusOfChangedRequest]);
            console.log('Request added successfully:', result);
        }
        catch (error) {
            console.error('Error adding request:', error);
        }
        yield deleteRequestById(requestId);
    });
}
function rejectRequest(requestId, idOfEmployee, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        yield connection.execute('UPDATE requests SET status = ? WHERE id = ?', ['Rejected', requestId]);
        const [changedRequest] = yield connection.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
        const changedParsedRequest = JSON.parse(JSON.stringify(changedRequest));
        const statusOfChangedRequest = changedParsedRequest[0].status;
        const sql = 'INSERT INTO approvedorrejectedholidays (employeeId, startDate, endDate, status) VALUES (?, ?, ?, ?)';
        try {
            const [result] = yield connection.execute(sql, [idOfEmployee, startDate, endDate, statusOfChangedRequest]);
            console.log('Request added successfully:', result);
        }
        catch (error) {
            console.error('Error adding request:', error);
        }
        yield deleteRequestById(requestId);
    });
}
function addOneRequest(employeeId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const sql = 'INSERT INTO requests (employeeId, startDate, endDate) VALUES (?, ?, ?)';
        try {
            const [result] = yield connection.execute(sql, [employeeId, startDate, endDate]);
            console.log('Request added successfully:', result);
        }
        catch (error) {
            console.error('Error adding request:', error);
        }
    });
}
export { failMessage, checkDates, getOneEmployee, getRequestsRows, getApprovedOrRejectedRequestsRows, getEmployeeRows, getRulesRows, deleteRequestById, updateRequest, getDatesOfOneRequest, getOneRequest, getEmployeeRemainingHolidays, approveRequest, rejectRequest, addOneRequest };
