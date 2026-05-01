<!-- SuperAdmin Credential -->
{ "name":"Super Admin",
 "email":"superadmin@hrms.com",
 "phone":9988776655, 
 "role":"super_admin"
}



<!-- Department -->
All Department 
Get /api/department/all

All Active Page-1
GET /api/department/all/active?page=1&limit=10

All Active Page-2
/api/department/all/active?page=2&limit=10

Create
POST /api/department/create

Update
PUT /api/department/update/:id

Soft Delete
Delete /api/department/delete/:id

RestoreDelete
POST /api/department/restore/


