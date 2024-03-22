
interface holidayRulesData {
    maxConsecutiveDays: number;
    blackoutStartDate: string;
    blackoutEndDate: string;
}

class HolidayRules implements holidayRulesData{
    maxConsecutiveDays: number;
    blackoutStartDate: string;
    blackoutEndDate: string;

    constructor(blackoutStartDate: string, blackoutEndDate: string,maxConsecutiveDays: number = 14){
        this.maxConsecutiveDays = maxConsecutiveDays;
        this.blackoutStartDate = blackoutStartDate;
        this.blackoutEndDate = blackoutEndDate;
    }
}

export{
    HolidayRules,
}

