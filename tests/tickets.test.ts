import supertest from "supertest";
import app from "../src/app";
import { response } from 'express';

const request = supertest(app)



describe("Tickets Module Integration testing", () => {


    let cutstomerToken: string;
    let adminToken: string;
    let createdTicketId: string;



    beforeAll(async () => {

        // obtain a  customer Token
        const customerLogin = await request.post('/api/auth/login').send({
            email: "customeruser@email.com",
            password: "supersecretpassword"
        })
        if (customerLogin.status === 200) cutstomerToken = customerLogin.body.data.token;

        // obtain admin/agent Token
        const adminLogin = await request.post('/api/auth/login').send({
            email: "jane@example.com",
            password: "supersecretpassword"
        })
        if (adminLogin.status === 200) adminToken = adminLogin.body.data.token;
    })


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

        it('should return a ticket when authenticated as customer', async () => {

            if (!cutstomerToken) return;

            const response = await request.post('/api/tickets').set("Authorization", `Bearer ${cutstomerToken}`).send({
                title: "Integration Test Ticket",
                description: "Integration test description",
                priority: "medium"
            })

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('id');
            // save this id for other tests 
            createdTicketId = response.body.data.id;
        })
    })

    describe("GET /api/tickets", () => {

        it('should return tickets list for authenticated user', async () => {

            if (!cutstomerToken) return

            const response = await request.get('/api/tickets').set("Authorization", `Bearer ${cutstomerToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
        })
    })
})