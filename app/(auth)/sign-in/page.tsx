'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import { signInWithEmail } from '@/lib/actions/auth.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const SignIn = () => {
    const router = useRouter();

    const { register, handleSubmit, formState: { errors, isSubmitting } } =
        useForm<SignInFormData>({
            defaultValues: { email: "", password: "" },
        });

    const onSubmit = async (data: SignInFormData) => {
        const result = await signInWithEmail(data);

        if (!result.success) {
            toast.error("Sign in failed", {
                description: result.error
            });
            return;
        }

        toast.success("Signed in successfully");
        router.push("/");
    };

    return (
        <>
            <h1 className="form-title">Welcome back</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="email"
                    label="Email"
                    placeholder="you@example.com"
                    register={register}
                    error={errors.email}
                    validation={{
                        required: "Email is required",
                        pattern: {
                            value: /^\S+@\S+\.\S+$/,
                            message: "Invalid email format"
                        }
                    }}
                />

                <InputField
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{
                        required: "Password is required",
                        minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters"
                        }
                    }}
                />

                <Button disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>

                <FooterLink
                    text="Don't have an account?"
                    linkText="Create an account"
                    href="/sign-up"
                />
            </form>
        </>
    );
};

export default SignIn;
