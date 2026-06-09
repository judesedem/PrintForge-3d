#GUIDELINES FOR THE PROJECT

Core Entities
Entity
Key Attributes
User                          user_id, full_name, email, password, role
PrintJob                      job_id, user_id, file_id, material_id, quantity, status, submitted_at
ModelFile                     file_id, file_name, file_url, file_type, uploaded_at
Material                      material_id, material_name, color, cost_per_unit, availability_status
Printer                       printer_id, printer_name, printer_status, lab_location
Estimate                      estimate_id, job_id, estimated_cost, estimated_time, generated_at
QueueEntry                    queue_id, job_id, printer_id, queue_position, assigned_at
Notification                  notification_id, user_id, message, type, is_read, created_at
DesignModel*                  model_id, designer_id, title, file_url, category, downloads, is_free, price,created_at
DesignRequest*                request_id, user_id, title, description, budget, deadline, status, created_at
Challenge*                    challenge_id, posted_by, title, description, prize, deadline, status







 API Design
AUTHENTICATION SERVICES

POST /api/auth/register | POST /api/auth/login

PRINT JOB SERVICE
POST /api/print-jobs | GET /api/print-jobs | GET /api/print-jobs/{id} | PUT /api/print-jobs/{id}

FILE SERVICES
POST /api/files/upload | GET /api/files/{id}

ESTIMATE SERVICE
POST /api/estimates/generate | GET /api/estimates/{jobId}

QUEUE SERVICE
GET /api/queue | PUT /api/queue/{jobId}/assign

NOTIFICATION SERVICE
GET /api/notifications | PUT /api/notifications/{id}/read

MARKETPLACE SERVICE (New)
POST /api/models | GET /api/models | GET /api/models/{id} | POST /api/design-requests | GET /api/design-requests |
POST /api/challenges | GET /api/challenges

ADMIN SERVICE
GET /api/admin/dashboard | GET /api/admin/printers | PUT /api/admin/printers/{id}/status | GET /api/admin/analytics