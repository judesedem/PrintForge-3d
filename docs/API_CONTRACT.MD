#GUIDELINES FOR THE PROJECT

Core Entities
Entity
Key Attributes
User
PrintJob
ModelFile
Material
Printer
Estimate
user_id, full_name, email, password, role
job_id, user_id, file_id, material_id, quantity, status, submitted_at
file_id, file_name, file_url, file_type, uploaded_at
material_id, material_name, color, cost_per_unit, availability_status
printer_id, printer_name, printer_status, lab_location
estimate_id, job_id, estimated_cost, estimated_time, generated_at
QueueEntry
Notification
DesignModel*
DesignRequest*
Challenge*
queue_id, job_id, printer_id, queue_position, assigned_at
notification_id, user_id, message, type, is_read, created_at
model_id, designer_id, title, file_url, category, downloads, is_free, price,
created_at
request_id, user_id, title, description, budget, deadline, status, created_at
challenge_id, posted_by, title, description, prize, deadline, status
* Items marked with an asterisk are new additions to the original proposal.
8. API Design
Authentication Service
POST /api/auth/register | POST /api/auth/login
Print Job Service
POST /api/print-jobs | GET /api/print-jobs | GET /api/print-jobs/{id} | PUT /api/print-jobs/{id}
File Service
POST /api/files/upload | GET /api/files/{id}
Estimate Service
POST /api/estimates/generate | GET /api/estimates/{jobId}
Queue Service
GET /api/queue | PUT /api/queue/{jobId}/assign
Notification Service
GET /api/notifications | PUT /api/notifications/{id}/read
Marketplace Service (New)
POST /api/models | GET /api/models | GET /api/models/{id} | POST /api/design-requests | GET /api/design-requests |
POST /api/challenges | GET /api/challenges
Admin Service
GET /api/admin/dashboard | GET /api/admin/printers | PUT /api/admin/printers/{id}/status | GET /api/admin/analytics