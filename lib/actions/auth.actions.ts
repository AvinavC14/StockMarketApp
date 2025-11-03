'use server';

import {auth} from "@/lib/better-auth/auth";
import {inngest} from "@/lib/inngest/client";
import {headers} from "next/headers";

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData) => {
    try {
        const a = await auth();
        const response = await a.api.signUpEmail({ body: { email, password, name: fullName } })

        if(response) {
            await inngest.send({
                name: 'app/user.created',
                data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry }
            })
        }

        return { success: true, data: response }
    }  catch (e: any) {
  console.log('Sign up failed', JSON.stringify(e, null, 2));
  return { success: false, error: e?.message || JSON.stringify(e) };
}

}

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    try {
        const a = await auth();
        const response = await a.api.signInEmail({
            body: { email, password }
        });

        return { success: true, data: response };
    } catch (e: any) {
        console.log("SignIn error:", e);

        return {
            success: false,
            error:
                e?.message ??
                e?.response?.data?.message ??
                "Invalid email or password"
        };
    }
};
export const signOut = async () => {
    try {
        const a = await auth();
        await a.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('Sign out failed', e)
        return { success: false, error: 'Sign out failed' }
    }
}

