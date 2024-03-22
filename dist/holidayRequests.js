const statusPending = "Pending";
const statusApproved = "Approved";
const statusRejected = "Rejected";
class HolidayRequests {
    constructor(emploeeId, startDate, endDate, status = statusPending) {
        this.employeeId = emploeeId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
    }
}
export { HolidayRequests, statusPending, statusApproved, statusRejected, };
