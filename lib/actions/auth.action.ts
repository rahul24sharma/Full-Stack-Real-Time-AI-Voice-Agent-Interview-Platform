"use server";
import { redirect } from "next/navigation";
import type { DocumentData } from "firebase-admin/firestore";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;
const BOOTSTRAP_ADMIN_EMAIL = "sharma.rahul1@northeastern.edu";

function getFirebaseErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }

  return undefined;
}

async function isAdminUser(userId: string) {
  const userRecord = await auth.getUser(userId);
  return userRecord.customClaims?.admin === true;
}

function normalizeUser(userId: string, data: DocumentData, isAdmin: boolean) {
  return {
    id: userId,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    role: isAdmin ? "admin" : "user",
    profilePic: String(data.profilePic ?? data.profileURL ?? ""),
    resume: String(data.resume ?? data.resumeURL ?? ""),
  } satisfies User;
}

async function grantBootstrapAdminIfNeeded(email: string, uid: string) {
  if (email !== BOOTSTRAP_ADMIN_EMAIL) return;

  const userRecord = await auth.getUser(uid);
  if (userRecord.customClaims?.admin === true) return;

  await auth.setCustomUserClaims(uid, { admin: true });
}

async function getBootstrapAdminUserDoc(email: string) {
  const userSnapshot = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (userSnapshot.empty) {
    return null;
  }

  return userSnapshot.docs[0];
}

export async function createBootstrapAdminCustomToken(email: string) {
  if (email !== BOOTSTRAP_ADMIN_EMAIL) {
    return {
      success: false,
      message: "Bootstrap admin access is only available for the admin account.",
    };
  }

  try {
    const existingAuthUser = await auth.getUserByEmail(email).catch(() => null);

    const userDoc = await getBootstrapAdminUserDoc(email);

    if (!userDoc && !existingAuthUser) {
      return {
        success: false,
        message:
          "No Firestore profile was found for the admin account. Please create the user record first.",
      };
    }

    const uid = existingAuthUser?.uid ?? userDoc?.id;
    if (!uid) {
      return {
        success: false,
        message: "Could not determine the admin account UID.",
      };
    }

    if (!existingAuthUser) {
      try {
        await auth.createUser({
          uid,
          email,
        });
      } catch (error) {
        const code = getFirebaseErrorCode(error);

        if (
          code !== "auth/uid-already-exists" &&
          code !== "auth/email-already-exists"
        ) {
          throw error;
        }
      }
    }

    await auth.setCustomUserClaims(uid, { admin: true });

    const customToken = await auth.createCustomToken(uid, { admin: true });

    return {
      success: true,
      customToken,
    };
  } catch (error) {
    console.error("Error creating bootstrap admin token:", error);

    return {
      success: false,
      message: "Failed to prepare the admin session. Please try again.",
    };
  }
}

// Set session cookie
export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  // Create session cookie
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000, // milliseconds
  });

  // Set cookie in the browser
  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signUp(params: SignUpParams) {
  const { uid, name, email, profilePic, resume } = params;

  try {
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists) {
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };
    }

    await db.collection("users").doc(uid).set({
      uid,
      name,
      email,
      profilePic: profilePic || "",
      resume: resume || "",
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: unknown) {
    console.error("Error creating user:", error);

    if (getFirebaseErrorCode(error) === "auth/email-already-exists") {
      return {
        success: false,
        message: "This email is already in use",
      };
    }

    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  try {
    const userRecord = await auth.getUserByEmail(email);
    if (email === BOOTSTRAP_ADMIN_EMAIL) {
      await grantBootstrapAdminIfNeeded(email, userRecord.uid);
    }
    await setSessionCookie(idToken);

    return {
      success: true,
      message: "Signed in successfully.",
    };
  } catch (error: unknown) {
    console.error("SignIn error:", error);

    if (getFirebaseErrorCode(error) === "auth/user-not-found") {
      if (email === BOOTSTRAP_ADMIN_EMAIL) {
        await setSessionCookie(idToken);

        return {
          success: true,
          message: "Signed in successfully.",
        };
      }

      return {
        success: false,
        message: "User does not exist. Create an account.",
      };
    }

    return {
      success: false,
      message: "Failed to log into account. Please try again.",
    };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete("session");
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const admin = await isAdminUser(decodedClaims.uid);

    // get user info from db
    const userRecord = await db
      .collection("users")
      .doc(decodedClaims.uid)
      .get();
    if (!userRecord.exists) return null;

    return normalizeUser(userRecord.id, userRecord.data() ?? {}, admin);
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (user.role !== "admin") {
    redirect("/");
  }

  return user;
}

export async function logout() {
  await signOut();
  redirect("/sign-in");
}
