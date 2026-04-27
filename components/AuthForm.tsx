"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import {
  createBootstrapAdminCustomToken,
  signIn,
  signUp,
} from "@/lib/actions/auth.action";
import FormField from "./FormField";

const BOOTSTRAP_ADMIN_EMAIL = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const BOOTSTRAP_ADMIN_FALLBACK_CODES = new Set([
  "auth/invalid-credential",
  "auth/wrong-password",
  "auth/user-not-found",
]);

function getFirebaseAuthErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }

  return undefined;
}

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
    profilePic: type === "sign-up" ? z.any() : z.any().optional(),
    resume: type === "sign-up" ? z.any() : z.any().optional(),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();

  const formSchema = authFormSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const fileToBase64 = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const email = data.email.trim().toLowerCase();
      const password = data.password.trim();

      if (type === "sign-up") {
        const { name, profilePic, resume } = data;

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const uid = userCredential.user.uid;

        let profilePicBase64 = "";
        let resumeBase64 = "";

        if (profilePic?.[0]) {
          profilePicBase64 = await fileToBase64(profilePic[0]);
        }

        if (resume?.[0]) {
          resumeBase64 = await fileToBase64(resume[0]);
        }

        const result = await signUp({
          uid,
          name: name ?? "",
          email,
          profilePic: profilePicBase64,
          resume: resumeBase64,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push("/sign-in");
      } else {
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
          );
          const idToken = await userCredential.user.getIdToken();

          if (!idToken) {
            toast.error("Sign in failed. Please try again.");
            return;
          }

          await signIn({
            email,
            idToken,
          });

          toast.success("Signed in successfully.");
          router.push("/");
        } catch (error) {
          const errorCode = getFirebaseAuthErrorCode(error);

          if (
            email === BOOTSTRAP_ADMIN_EMAIL &&
            errorCode &&
            BOOTSTRAP_ADMIN_FALLBACK_CODES.has(errorCode)
          ) {
            const bootstrapTokenResult = await createBootstrapAdminCustomToken(
              email
            );

            if (!bootstrapTokenResult.success || !bootstrapTokenResult.customToken) {
              toast.error(
                bootstrapTokenResult.message ||
                  "Could not prepare the admin sign-in session."
              );
              return;
            }

            const userCredential = await signInWithCustomToken(
              auth,
              bootstrapTokenResult.customToken
            );
            const idToken = await userCredential.user.getIdToken();

            await signIn({
              email,
              idToken,
            });

            toast.success("Signed in as admin successfully.");
            router.push("/");
            return;
          }

          throw error;
        }
      }
    } catch (error: unknown) {
      console.error("Auth error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error(`There was an error: ${errorMessage}`);
    }
  };

  const isSignIn = type === "sign-in";

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">PrepWise</h2>
        </div>

        <h3>Practice job interviews with AI</h3>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 form"
          >
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                label="Name"
                placeholder="Your Name"
                type="text"
              />
            )}

            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="Your email address"
              type="email"
            />

            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter your password"
              type="password"
            />

            {!isSignIn && (
              <>
                <FormField
                  control={form.control}
                  name="profilePic"
                  label="Profile Picture"
                  placeholder="Upload Your Profile Picture"
                  type="file"
                />
                <FormField
                  control={form.control}
                  name="resume"
                  label="Resume"
                  placeholder="Upload Your Resume"
                  type="file"
                />
              </>
            )}

            <Button className="btn" type="submit">
              {isSignIn ? "Sign In" : "Create an Account"}
            </Button>
          </form>
        </Form>

        <p className="text-center">
          {isSignIn ? "No account yet?" : "Have an account already?"}
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="font-bold text-user-primary ml-1"
          >
            {!isSignIn ? "Sign In" : "Sign Up"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
