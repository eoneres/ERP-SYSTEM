import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Employee }   from './entities/employee.entity';
import { Payroll }    from './entities/payroll.entity';
import { TimeRecord } from './entities/time-record.entity';

// User entity from auth module (cross-module management)
import { User } from '@modules/auth/entities/user.entity';

import { HRService } from './services/hr.service';
import {
  EmployeesController,
  HRUsersController,
  PayrollController,
  AttendanceController,
  HRDashboardController,
} from './controllers/hr.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Payroll, TimeRecord, User])],
  controllers: [
    EmployeesController,
    HRUsersController,
    PayrollController,
    AttendanceController,
    HRDashboardController,
  ],
  providers: [HRService],
  exports: [HRService],
})
export class HRModule {}
