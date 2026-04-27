import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

const interviewQuestionsSchema = z.array(z.string().min(1)).min(1);

function getFallbackQuestions(params: CreateInterviewParams) {
  const { role, type, level, techstack, amount } = params;

  const technicalPrompts = [
    `Walk me through a project where you used ${techstack[0] ?? "this stack"} and explain the tradeoffs you made.`,
    `How would you approach building a ${role.toLowerCase()} feature for a ${level.toLowerCase()} role?`,
    `Which part of ${techstack.join(", ")} would you want to learn deeper, and why?`,
    `Describe a time you debugged a difficult issue in ${techstack[0] ?? "your stack"}.`,
    `How do you make sure your code stays maintainable on a team?`,
  ];

  const behavioralPrompts = [
    `Tell me about a time you had to learn something quickly to deliver a result.`,
    `Describe a situation where you disagreed with a teammate and how you handled it.`,
    `How do you prioritize work when you have multiple deadlines?`,
    `Tell me about a project you are proud of and what your role was.`,
    `How do you handle feedback when your solution is not the one chosen?`,
  ];

  const mixedPrompts = [
    `Tell me about a project where both your technical decisions and teamwork mattered.`,
    `How do you balance speed and quality when shipping as a ${role.toLowerCase()}?`,
    `Describe a time you solved a technical problem while coordinating with others.`,
    `What would your approach be for improving an existing ${techstack[0] ?? "application"} codebase?`,
    `How do you communicate progress and risks when a project is blocked?`,
  ];

  const source =
    type === "Behavioral"
      ? behavioralPrompts
      : type === "Mixed"
        ? mixedPrompts
        : technicalPrompts;

  const targetCount = Math.max(3, amount);

  return Array.from({ length: targetCount }, (_, index) => {
    const question = source[index % source.length];
    return `${index + 1}. ${question}`;
  });
}

export async function createInterviewTemplate(
  params: CreateInterviewParams,
  userId: string
) {
  const { type, role, level, techstack, amount } = params;

  let questions: string[];

  try {
    const result = await generateObject({
      model: google("gemini-2.0-flash-001"),
      schema: interviewQuestionsSchema,
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack.join(", ")}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    questions = result.object;
  } catch (error) {
    console.error("Gemini question generation failed, using fallback questions:", error);
    questions = getFallbackQuestions(params);
  }

  const interview = {
    role,
    type,
    level,
    techstack,
    questions,
    userId,
    finalized: true,
    coverImage: getRandomInterviewCover(),
    createdAt: new Date().toISOString(),
  };

  const interviewRef = await db.collection("interviews").add(interview);

  return {
    interviewId: interviewRef.id,
    interview,
  };
}
