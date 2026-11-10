import supertest from "supertest";
import app from "../src/app";
import path from "path";

const request = supertest(app)

describe("Tickets Module Integration testing", () => {

    let customerAToken: string;
    let customerBToken: string;
    let adminToken: string;
    let ticketId: string;

    // pre requests needed 
    beforeAll(async () => {

        //Authenticate Customer A
        const customerALogin = await request.post('/api/auth/login').send({
            email: "customeruser@email.com",
            password: "supersecretpassword"
        });
        customerAToken = customerALogin.body.data.token;


        //Authenticate Customer B
        const customerBLogin = await request.post('/api/auth/login').send({
            email: "customeruser2@email.com",
            password: "supersecretpassword"
        });
        customerBToken = customerBLogin.body.data.token;

        //Authenticate admin/agent
        const adminLogin = await request.post('/api/auth/login').send({
            email: "jane@example.com",
            password: "supersecretpassword"
        })
        adminToken = adminLogin.body.data.token;
    })

    // ticket creation suite 
    describe("POST /api/tickets", () => {
        // create tickets  without header case
        it("should return 401 if no authorization header is provided", async () => {
            const response = await request.post('/api/tickets').send({
                title: 'Test Ticket Title',
                description: "Test ticket description content"
            })
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        })

        it('should create a ticket as Customer A', async () => {
            const response = await request.post('/api/tickets').set('Authorization', `Bearer ${customerAToken}`)
                .send({
                    title: 'Customer A Private Issue',
                    description: 'This ticket contains private tenant data.',
                    priority: 'high',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');

            ticketId = response.body.data.id;
        })
    })

    // Resource ownership isolation
    describe('GET /api/tickets/:id - Resource Ownership Isolation', () => {

        it('should allow Customer A to access their own ticket', async () => {

            const response = await request
                .get(`/api/tickets/${ticketId}`)
                .set('Authorization', `Bearer ${customerAToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(ticketId);
        });

        it('should return 403 Forbidden when Customer B attempts to view Customer A ticket', async () => {
            const response = await request
                .get(`/api/tickets/${ticketId}`)
                .set('Authorization', `Bearer ${customerBToken}`);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });
    });

    // RABC SUITE 
    describe('PATCH /api/tickets/:id - RBAC Status Restriction', () => {
        it('should return 403 Forbidden when a Customer attempt to update status', async () => {
            const response = await request
                .patch(`/api/tickets/${ticketId}`)
                .set('Authorization', `Bearer ${customerAToken}`)
                .send({ status: 'in_progress' });

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });

        it('should return 200 OK when an Admin/Agent updates ticket status', async () => {
            const response = await request
                .patch(`/api/tickets/${ticketId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'in_progress' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('in_progress');
        });
    });

    // file upload suite 
    describe('POST /api/tickets/:id/attachments - Attachment Uploads', () => {
        it('should successfully upload an attachment to an existing ticket', async () => {
            // Point directly to your physical file on disk
            const filePath = path.join(__dirname, 'fixtures/sample.txt');

            const response = await request
                .post(`/api/tickets/${ticketId}/attachments`)
                .set('Authorization', `Bearer ${customerAToken}`)
                .attach('file', filePath);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });
    });

    // filterring suite 
    describe('GET /api/tickets - Query Pagination & Filtering', () => {
        it('should return paginated tickets with pagination metadata', async () => {
            const response = await request
                .get('/api/tickets?page=1&limit=5')
                .set('Authorization', `Bearer ${customerAToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('meta');
            expect(response.body.meta).toHaveProperty('currentPage', 1);
            expect(response.body.meta).toHaveProperty('limit', 5);
        });

        it('should correctly filter tickets by status and priority', async () => {
            const response = await request
                .get('/api/tickets?status=open&priority=high')
                .set('Authorization', `Bearer ${customerAToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });
})

