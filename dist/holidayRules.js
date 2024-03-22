class HolidayRules {
    constructor(blackoutStartDate, blackoutEndDate, maxConsecutiveDays = 14) {
        this.maxConsecutiveDays = maxConsecutiveDays;
        this.blackoutStartDate = blackoutStartDate;
        this.blackoutEndDate = blackoutEndDate;
    }
}
export { HolidayRules, };
