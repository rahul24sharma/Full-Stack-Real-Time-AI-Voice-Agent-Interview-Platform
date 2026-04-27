"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { createInterview } from "@/lib/actions/general.action";
import FormField from "./FormField";

const interviewCreateSchema = z.object({
  role: z.string().min(3, "Role must be at least 3 characters."),
  level: z.enum(["Junior", "Mid-level", "Senior", "Lead"]),
  type: z.enum(["Technical", "Behavioral", "Mixed"]),
  techstack: z.string().min(2, "Add at least one technology."),
  amount: z.coerce.number().min(3).max(10),
});

const levelOptions = [
  { label: "Junior", value: "Junior" },
  { label: "Mid-level", value: "Mid-level" },
  { label: "Senior", value: "Senior" },
  { label: "Lead", value: "Lead" },
];

const typeOptions = [
  { label: "Technical", value: "Technical" },
  { label: "Behavioral", value: "Behavioral" },
  { label: "Mixed", value: "Mixed" },
];

const InterviewCreateForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof interviewCreateSchema>>({
    resolver: zodResolver(interviewCreateSchema),
    defaultValues: {
      role: "",
      level: "Junior",
      type: "Technical",
      techstack: "",
      amount: 5,
    },
  });

  const onSubmit = (values: z.infer<typeof interviewCreateSchema>) => {
    const techstack = values.techstack
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (techstack.length === 0) {
      toast.error("Please add at least one technology.");
      return;
    }

    startTransition(async () => {
      const result = await createInterview({
        role: values.role.trim(),
        level: values.level,
        type: values.type,
        techstack,
        amount: values.amount,
      });

      if (!result.success) {
        toast.error(result.message || "Could not create the interview.");
        return;
      }

      toast.success("Interview created successfully.");
      router.push(`/interview/${result.interviewId}`);
    });
  };

  return (
    <div className="card-border w-full">
      <div className="card p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-3 mb-8">
          <p className="text-sm uppercase tracking-[0.18em] text-primary-100">
            Admin studio
          </p>
          <div className="flex items-start justify-between gap-4 max-sm:flex-col">
            <div className="flex flex-col gap-2">
              <h3>Create Interview</h3>
              <p className="text-light-100 max-w-2xl">
                Create a focused interview template and publish it directly to
                the dashboard.
              </p>
            </div>
            <div className="rounded-full border border-primary-200/20 bg-dark-200 px-4 py-2 text-sm text-primary-100 whitespace-nowrap">
              Admin only
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                label="Role"
                type="text"
              />
              <FormField
                control={form.control}
                name="level"
                label="Experience Level"
                type="select"
                options={levelOptions}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                label="Interview Type"
                type="select"
                options={typeOptions}
              />
              <FormField
                control={form.control}
                name="amount"
                label="Question Count"
                placeholder="5"
                type="number"
              />
            </div>

            <FormField
              control={form.control}
              name="techstack"
              label="Tech Stack"
              placeholder="React, Next.js, TypeScript, Tailwind CSS"
              type="textarea"
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto min-w-32 rounded-full border-white/10 bg-transparent text-primary-200 hover:bg-white/5"
                onClick={() => router.push("/")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto min-w-44 rounded-full bg-primary-200 text-dark-100 hover:bg-primary-200/80 font-bold"
                disabled={isPending}
              >
                {isPending ? "Creating..." : "Create Interview"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default InterviewCreateForm;
