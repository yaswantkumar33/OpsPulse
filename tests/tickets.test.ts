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

    // Ticket Assigment suite 
    describe("PATCH /api/tickets/:id - Ticket Assigments", () => {

        const getUserIdFromToken = (token: string) =>
            JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).userId;

        it("should allow an Admin/Agent to assign a ticket to a valid Agent/Admin (200)", async () => {
            const adminAId = getUserIdFromToken(adminToken);
            const res = await request
                .patch(`/api/tickets/${ticketId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ assignedAgentId: adminAId });

            expect(res.status).toBe(200);
            expect(res.body.data.assignedAgentId).toBe(adminAId);
        });

        it("should reject assigning a ticket to a user with the customer role", async () => {
            const customerAId = getUserIdFromToken(customerAToken);

            const res = await request
                .patch(`/api/tickets/${ticketId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ assignedAgentId: customerAId });

            expect([400, 403]).toContain(res.status);
        });

        it("should return 404 when assigning a ticket to a non-existent user UUID", async () => {
            const fakeUserId = "00000000-0000-0000-0000-000000000000";
            const res = await request
                .patch(`/api/tickets/${ticketId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ assignedAgentId: fakeUserId });

            expect([400, 404]).toContain(res.status);
        });

    })

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

    // comments suite 
    describe("POST /api/tickets/:id/comments - Ticket Conversation", () => {

        it("should allow Customer A to post a commnet on their own ticket (201)", async () => {
            const res = await request
                .post(`/api/tickets/${ticketId}/comments`)
                .set("Authorization", `Bearer ${customerAToken}`)
                .send({ content: "Following up on this issue with additional logs." });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty("id");
            expect(res.body.data.content).toBe("Following up on this issue with additional logs.");
        })

        it("should allow an Admin/Agent to reply to the ticket (201)", async () => {
            const res = await request
                .post(`/api/tickets/${ticketId}/comments`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ content: "We are investigating this now." });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("should return 403 Forbidden when Customer B tries to comment on Customer A's ticket", async () => {
            const res = await request
                .post(`/api/tickets/${ticketId}/comments`)
                .set("Authorization", `Bearer ${customerBToken}`)
                .send({ content: "Unauthorized comment attempt" });

            expect(res.status).toBe(403);
        });

        it("should return 400 Bad Request when comment content is empty or whitespace", async () => {
            const res = await request
                .post(`/api/tickets/${ticketId}/comments`)
                .set("Authorization", `Bearer ${customerAToken}`)
                .send({ content: "   " });

            expect(res.status).toBe(400);
        });

        it("should return 404 Not Found for a non-existent ticket UUID", async () => {
            const fakeUuid = "00000000-0000-0000-0000-000000000000";
            const res = await request
                .post(`/api/tickets/${fakeUuid}/comments`)
                .set("Authorization", `Bearer ${customerAToken}`)
                .send({ content: "Comment on missing ticket" });

            expect(res.status).toBe(404);
        });
    })
    describe("GET /api/tickets/:id/comments - Fetch Thread", () => {
        it("should return chronological comments with author details for Customer A (200)", async () => {
            const res = await request
                .get(`/api/tickets/${ticketId}/comments`)
                .set("Authorization", `Bearer ${customerAToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
            expect(res.body.data[0]).toHaveProperty("author");
            expect(res.body.data[0].author).toHaveProperty("name");
        });

        it("should return 403 Forbidden when Customer B tries to read Customer A's comments", async () => {
            const res = await request
                .get(`/api/tickets/${ticketId}/comments`)
                .set("Authorization", `Bearer ${customerBToken}`);

            expect(res.status).toBe(403);
        });
    });

})

