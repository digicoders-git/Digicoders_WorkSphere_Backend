import express, { json } from 'express'
import connectdb from './config/db.js'
import cors from 'cors'
import CompanyRoute from './route/CompanyRoutes.js'       
import DepartmentRoute from './route/DepartmentRoute.js'
import DesignationRoute from './route/DesignationRoute.js'
import EmployeeStatusRoute from './route/EmploymentStatusRoute.js'
import RoleRoute from './route/RoleRoutes.js' 
import UserRoute from './route/UserRoute.js'
import WorkShiftRoute from './route/WorkShiftRoute.js'
import permissionRoute from './route/permissionRoute.js'
import AttendanceRoute from './route/AttendanceRoute.js'
import NotificationRoute from './route/NotificationRoute.js'
import HolidayRoute from './route/HolidayRoute.js'
import LeaveTypeRoute from './route/LeaveTypeRoute.js'
import LeaveRoute from './route/LeaveRoute.js'
import RegularizationRoute from './route/RegularizationRoute.js'
import PayrollRoute from './route/PayrollRoute.js'
import ProjectRoute from './route/ProjectRoute.js'
import TaskRoute from './route/TaskRoute.js'
import cookieParser from 'cookie-parser'
import { startScheduler } from './utills/scheduler.js'

import EnvData from './config/EnvData.js'
const app= express();
app.use(express.json())
app.use(cookieParser())

const allowedOrigins = EnvData.CLIENT_URL
    ? EnvData.CLIENT_URL.split(",").map(o => o.trim())
    : ["http://localhost:5173"];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
}))

app.use('/api/company', CompanyRoute);
app.use("/api/permissions", permissionRoute);
app.use('/api/department', DepartmentRoute);
app.use('/api/designation', DesignationRoute);
app.use('/api/employment-status', EmployeeStatusRoute);
app.use('/api/role', RoleRoute);
app.use('/api/user', UserRoute);
app.use('/api/workshift', WorkShiftRoute);
app.use('/api/attendance', AttendanceRoute);
app.use('/api/notifications', NotificationRoute);
app.use('/api/holidays', HolidayRoute);
app.use('/api/leave-types', LeaveTypeRoute);
app.use('/api/leaves', LeaveRoute);
app.use('/api/regularization', RegularizationRoute);
app.use('/api/payroll', PayrollRoute);
app.use('/api/projects', ProjectRoute);
app.use('/api/tasks', TaskRoute);

app.get('/', (req, res) => {
    res.send("API is running")
})


app.use('/api/health', (req, res) => {
    res.send("API is working fine")
})





const server = app.listen(EnvData.PORT,()=>{
    connectdb()
    startScheduler()
    console.log(`Server is running on port ${EnvData.PORT}`)
})

server.timeout = 120000;          // 2 min — time for a single request to complete
server.keepAliveTimeout = 120000; // 2 min — keep socket alive between requests
server.headersTimeout = 125000;   // slightly above keepAliveTimeout