type requestStatus = "Pending" | "Approved" | "Rejected";
const statusPending:requestStatus = "Pending";
const statusApproved:requestStatus = "Approved";
const statusRejected:requestStatus = "Rejected";


interface holidayRequestsData {
    employeeId: number;
    startDate: string;
    endDate: string;
    status: requestStatus;
}

class HolidayRequests implements holidayRequestsData{
    employeeId: number;
    startDate: string;
    endDate: string;
    status: requestStatus;

    constructor(emploeeId: number, startDate: string, endDate: string, status: requestStatus = statusPending){
        this.employeeId = emploeeId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
    }
}

export {
    HolidayRequests,
    statusPending,
    statusApproved,
    statusRejected,
}

