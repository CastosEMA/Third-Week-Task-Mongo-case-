import { Employee } from './employees.js';
import { HolidayRequests, statusPending, statusApproved, statusRejected } from './holidayRequests.js';
import { HolidayRules } from './holidayRules.js';
import {failMessage, checkDates, getOneEmployee, getRequestsRows, getApprovedOrRejectedRequestsRows, getEmployeeRows, getRulesRows, deleteRequestById, updateRequest, getDatesOfOneRequest, getOneRequest, getEmployeeRemainingHolidays, approveRequest, rejectRequest, addOneRequest} from './database operations/database_operations.js'

import { format,areIntervalsOverlapping , formatDistance, formatRelative, isValid, isWeekend, eachDayOfInterval, differenceInDays, subDays } from 'date-fns';
import express, {Request, response, Response} from 'express';
import path from 'path';
import ejs from 'ejs';
import axios, { AxiosResponse } from 'axios';
import bodyParser  from 'body-parser';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import {RowDataPacket} from 'mysql2/promise';



import { MongoClient, Db } from 'mongodb';
import { config } from 'dotenv'


config()
const dbUrl:string = process.env.MONG_DB_URL as string;

// const client = new MongoClient(dbUrl);
// async function get_smthng() {
//     try {
//         // Assuming 'client' is already defined and initialized elsewhere in your code
//         await client.connect();
//         console.log('Connected successfully to server');
//
//         const db = client.db("app");
//         const collection = db.collection('documents');
//         const document = { name: "John", age: 30, city: "New York" };
//
//         const result = await collection.insertOne(document);
//         console.log('Found documents:', document);
//
//         // Don't forget to close the connection when you're done
//         await client.close();
//         console.log('Connection closed successfully');
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port:number = Number(process.env.PORT as string);

app.use(bodyParser.urlencoded());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Request Body:', req.body);
    next();
});

app.listen(port, () => {
    console.log(`Server started at ${port} port`);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let successMessage:string;

async function main(){

    interface Holiday {
        date: string;
        localName: string;
        name: string;
        countryCode: string;
    }

    async function fetchHolidays(year: number, countryCode: string): Promise<Holiday[]> {
        try {
            const response: AxiosResponse<Holiday[]> = await axios.get<Holiday[]>(`https://date.nager.at/api/v3/publicholidays/${year}/${countryCode}`);
            return response.data;
        } catch (error) {
            console.error('An error occurred while executing the request:', error);
            return [];
        }
    }

    const holidays: Holiday[] = [];
    let relevantHolidays: Holiday[] = [];
    fetchHolidays(2024, 'UA')
        .then((holidaysData: Holiday[]) => {
            holidays.push(...holidaysData);
        })
        .catch((error) => {
            console.error('An error occurred while receiving holidays:', error);
        });

    //endpoints
    app.post('/delete-request', (req, res) => {
        try {

        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    });

    app.delete('/delete-request', (req, res) => {
        try {
            const requestId:number = Number(req.query.requestId);
            const result = req.query.result;
            if(result){
                deleteRequestById(requestId);
            }
            successMessage = "Holiday request deleted successfully!";
            res.redirect('/holidays');
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    });
    
    app.get('/employees', async (req, res) => {
        try {
            const employeesJson = await getEmployeeRows();
            res.render('employees', { employeesJson});
        } catch (e) {
            res.status(500).send('Internal Server Error');
        }
    });

    //in the 3rd task this endpoint was called /holidays, but in the 4rth it was renamed to /requests, but we decided to dont rename it
    app.get('/holidays', async (req, res) => {
        try {
            const requestsJson: HolidayRequests[] = await getRequestsRows();
            const approvedOrRejectedRequests: HolidayRequests[] = await getApprovedOrRejectedRequestsRows();

            relevantHolidays = [];
            const dates = requestsJson.map(request => {
                return {
                    startDate: request.startDate,
                    endDate: request.endDate
                };
            });

            holidays.forEach(holiday => {
                dates.forEach(date => {
                    if (areIntervalsOverlapping(
                        {start: new Date(holiday.date), end: new Date(holiday.date)},
                        {start: new Date(date.startDate), end: new Date(date.endDate)}
                    )) {
                        relevantHolidays.push(holiday);
                    }
                });
            });
            res.render('holidays', {requestsJson, approvedOrRejectedRequests, successMessage, relevantHolidays});
        } catch (error) {
            console.error('Error fetching requests:', error);
            res.status(500).send('Internal Server Error');
        }
    })

    app.post('/approve-reject-holiday', async (req, res) => {
        try {
            try {
                const idOfEmployee = parseInt(req.body.idOfEmployee);
                const action = req.body.action;
                const requestId = parseInt(req.body.requestId);

                const request = await getOneRequest(requestId);

                const remainingHolidays: number  = await getEmployeeRemainingHolidays(idOfEmployee);
                
                const {startDate, endDate} = await getDatesOfOneRequest(requestId);
                const holidayLength = differenceInDays(endDate, startDate);
                const leftHolidays = remainingHolidays - holidayLength;

                if (request) {
                    if (action === 'approve') {
                        await approveRequest(requestId, leftHolidays, idOfEmployee, startDate, endDate);
                        successMessage = 'Holiday request approved successfully!'
                        res.redirect('/holidays');
                    } else if (action === 'reject') {
                        await rejectRequest(requestId, idOfEmployee, startDate, endDate);
                        successMessage = 'Holiday request rejected successfully!'
                        res.redirect('/holidays');
                    } else if (action === 'update') {
                        res.redirect(`/update-request?requestId=${requestId}`);
                    }
                } else {
                    res.status(404).send('Request not found');
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    });

    app.get('/add-holiday', async (req, res) => {
        try {
            const employeesJson = await getEmployeeRows();
            res.render('add-holiday', {failMessage, holidays, employeesJson});
        } catch (error) {
            res.status(500).send(error);
        }
    });

    app.post("/add-holiday", async (req, res) => {

        const employeeId = parseInt(req.body.employeeId as string);
        const startDate = req.body.startDate as string;
        const endDate = req.body.endDate as string;

        if( await checkDates(employeeId, startDate, endDate)){
            await addOneRequest(employeeId, startDate, endDate);
            successMessage = "Holiday request created successfully!";
            res.redirect('/holidays');
        }else {
            res.redirect('/add-holiday');
        }
    });

    app.get('/update-request', (req, res) => {
        try {
            const idOfRequest: number = Number(req.query.requestId);
            console.log('Request ID' + idOfRequest);
            res.render('update-request', { idOfRequest: idOfRequest});
        } catch (error) {
            res.status(500).send(error);
        }
    });

    app.post('/update-request', (req, res) => {
        const startDate:string = req.body.startDate;
        const endDate:string = req.body.endDate;
        const id = Number(req.body.idOfRequest as string);

        updateRequest(id,startDate,endDate);
        res.redirect('/holidays');
    });

}

main();