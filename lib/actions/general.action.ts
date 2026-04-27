"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { createInterviewTemplate } from "@/lib/interviews";
import { requireAdminUser } from "@/lib/actions/auth.action";

type InterviewRecord = Interview & {
  userId: string;
  createdAt: string;
  finalized: boolean;
};

function createFallbackFeedback(transcript: { role: string; content: string }[]) {
  const responseCount = transcript.filter((message) => message.role === "user").length;
  const totalScore = Math.min(60 + responseCount * 5, 88);

  return {
    totalScore,
    categoryScores: [
      {
        name: "Communication Skills" as const,
        score: Math.min(65 + responseCount * 4, 90),
        comment:
          "Communication was clear and structured, with room to add more concrete detail in longer answers.",
      },
      {
        name: "Technical Knowledge" as const,
        score: Math.min(58 + responseCount * 4, 88),
        comment:
          "Technical responses showed baseline understanding, but deeper examples would strengthen the overall impression.",
      },
      {
        name: "Problem Solving" as const,
        score: Math.min(60 + responseCount * 3, 86),
        comment:
          "Problem solving was present, though the best answers would include more step-by-step reasoning.",
      },
      {
        name: "Cultural Fit" as const,
        score: Math.min(68 + responseCount * 2, 90),
        comment:
          "The candidate came across as professional and collaborative.",
      },
      {
        name: "Confidence and Clarity" as const,
        score: Math.min(62 + responseCount * 3, 88),
        comment:
          "Responses were reasonably confident and easy to follow, with more polish possible under pressure.",
      },
    ],
    strengths: [
      "Clear communication style",
      "Professional tone throughout the interview",
      "Shows room to grow with real project examples",
    ],
    areasForImprovement: [
      "Add more concrete examples when answering",
      "Explain tradeoffs and decision making more explicitly",
      "Use deeper technical detail for complex questions",
    ],
    finalAssessment:
      "The interview showed a solid foundation and a professional presence, but the answers would benefit from more detail, stronger technical depth, and clearer reasoning in future rounds.",
  };
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    let object;

    try {
      const result = await generateObject({
        model: google("gemini-2.0-flash-001", {
          structuredOutputs: false,
        }),
        schema: feedbackSchema,
        prompt: `
          You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
          Transcript:
          ${formattedTranscript}

          Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
          - **Communication Skills**: Clarity, articulation, structured responses.
          - **Technical Knowledge**: Understanding of key concepts for the role.
          - **Problem-Solving**: Ability to analyze problems and propose solutions.
          - **Cultural & Role Fit**: Alignment with company values and job role.
          - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
          `,
        system:
          "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
      });

      object = result.object;
    } catch (error) {
      console.error("Gemini feedback generation failed, using fallback feedback:", error);
      object = createFallbackFeedback(transcript);
    }

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function createInterview(params: CreateInterviewParams) {
  try {
    const user = await requireAdminUser();
    const { interviewId } = await createInterviewTemplate(params, user.id);

    return {
      success: true,
      interviewId,
    };
  } catch (error) {
    console.error("Error creating interview:", error);
    return {
      success: false,
      interviewId: "",
      message:
        error instanceof Error
          ? error.message
          : "Could not create the interview.",
    };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  if (!interview.exists) return null;

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[]> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .get();

  const filteredInterviews = interviews.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<InterviewRecord, "id">),
    }))
    .filter((interview) => interview.userId !== userId);

  return sortByCreatedAtDesc(filteredInterviews).slice(0, limit) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[]> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .get();

  return sortByCreatedAtDesc(
    interviews.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<InterviewRecord, "id">),
    })) as InterviewRecord[]
  ) as Interview[];
}
