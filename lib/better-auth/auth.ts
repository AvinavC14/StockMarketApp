import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { connectToDatabase } from "@/database/mongoose";
import { nextCookies } from "better-auth/next-js";

let authInstance: ReturnType<typeof betterAuth> | null = null;

export async function auth() {
    if (authInstance) return authInstance;

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection failed");

    authInstance = betterAuth({
        database: mongodbAdapter(db as any),
        secret: process.env.BETTER_AUTH_SECRET!,
        baseURL: process.env.BETTER_AUTH_URL!,
        emailAndPassword: {
            enabled: true,
            disableSignUp: false,
            requireEmailVerification: false, 
            minPasswordLength: 8,
            maxPasswordLength: 128,
            autoSignIn: true,
        },
        plugins: [nextCookies()],
        user: {
            additionalFields: {
                country: {
                    type: "string",
                    required: false,
                },
                investmentGoals: {
                    type: "string",
                    required: false,
                },
                riskTolerance: {
                    type: "string",
                    required: false,
                },
                preferredIndustry: {
                    type: "string",
                    required: false,
                },
            },
        },
    });

    return authInstance;
}