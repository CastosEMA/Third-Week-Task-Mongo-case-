interface EmployeeData {
    id: number;
    name: string;
    remainingHolidays: number;
}

class Employee implements EmployeeData {
    id: number;
    name: string;
    remainingHolidays: number;

    constructor(id: number, name: string, remainingHolidays: number){
        this.id = id;
        this.name = name;
        this. remainingHolidays = remainingHolidays;    
    }
}

export {
    Employee,
}


