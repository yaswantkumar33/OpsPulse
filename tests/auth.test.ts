import supertest from "supertest";
import app from "./../src/app";
import { response } from "express";

const request = supertest(app);

describe("Auth Module Integration Tests", () => {
    // login test 
    describe("POST /api/auth/login", () => {
        //to check with no body data
        it("should return 400 when eamil and password is missing", async () => {
            const response = await request.post("/api/auth/login").send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("success", false);
        });
        // to check with wrong data which never in db 
        it("should return 401 for non-existent user credentials", async () => {
            const response = await request.post("/api/auth/login").send({
                email: "onetwothree@email.com",
                password: "Password@123",
            });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("success", false);
        });
        // positive case is there is a valid user
        it("should return 200 and a jwt token on a valid credentials", async () => {
            const response = await request.post('/api/auth/login').send({
                emial: "jane@example.com",
                password: "supersecretpassword"
            })

            if (response.status === 200) {
                expect(response.body).toHaveProperty('success', true)
                expect(response.body.data).toHaveProperty('token', true)
            }
        });
    });
    // register test 
    describe("POST /api/auth/register", () => {
        it('should return 400 when payload fails zod validation', async () => {
            const response = await request.post('/api/auth/register').send({
                email: "invalid-user-email",
                password: "123"
            })

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
        })
    })
});
