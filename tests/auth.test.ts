import supertest from "supertest";
import app from "./../src/app";
import { response } from "express";

const request = supertest(app);

describe("Auth Module Integration Tests", () => {
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
    });
});
