"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth, db } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { setDoc, doc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";

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

  // const onSubmit = async (data: z.infer<typeof formSchema>) => {
  //   try {
  //     if (type === "sign-up") {
  //       const { name, email, password } = data;

  //       const userCredential = await createUserWithEmailAndPassword(
  //         auth,
  //         email,
  //         password
  //       );

  //       const result = await signUp({
  //         uid: userCredential.user.uid,
  //         name: name!,
  //         email,
  //         password,
  //       });
  //       console.log(result);

  //       if (!result.success) {
  //         toast.error(result.message);
  //         return;
  //       }

  //       toast.success("Account created successfully. Please sign in.");
  //       router.push("/sign-in");
  //     } else {
  //       const { email, password } = data;

  //       const userCredential = await signInWithEmailAndPassword(
  //         auth,
  //         email,
  //         password
  //       );

  //       const idToken = await userCredential.user.getIdToken();
  //       if (!idToken) {
  //         toast.error("Sign in Failed. Please try again.");
  //         return;
  //       }

  //       await signIn({
  //         email,
  //         idToken,
  //       });

  //       toast.success("Signed in successfully.");
  //       router.push("/");
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     toast.error(`There was an error: ${error}`);
  //   }
  // };

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

        // Step 1: Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const uid = userCredential.user.uid;

        // Step 2: Process file uploads
        let profileURL = "";
        let resumeURL = "";

        if (profilePic?.[0]) {
          profileURL = await fileToBase64(profilePic[0]);
        }

        if (resume?.[0]) {
          resumeURL = await fileToBase64(resume[0]);
        }

        // Step 3: Save user metadata in Firestore
        await setDoc(doc(db, "users", uid), {
          uid,
          name,
          email,
          profilePic: profileURL,
          resume: resumeURL,
          createdAt: new Date().toISOString(),
        });

        toast.success("Account created successfully. Please sign in.");
        router.push("/sign-in");
      } else {
        // Sign in flow
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
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      const errorMessage = error?.message || "An unexpected error occurred.";
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
