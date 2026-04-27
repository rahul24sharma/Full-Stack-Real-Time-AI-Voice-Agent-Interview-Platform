import Link from "next/link";

import { Button } from "@/components/ui/button";
import InterviewCreateForm from "@/components/InterviewCreateForm";
import { requireAdminUser } from "@/lib/actions/auth.action";

const NewInterviewPage = async () => {
  await requireAdminUser();

  return (
    <section className="flex flex-col gap-6 w-full">
      <div className="card-border w-full">
        <div className="card p-8 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 max-w-2xl">
              <p className="text-sm uppercase tracking-[0.2em] text-primary-100">
                Admin studio
              </p>
              <h2>Build a new interview template</h2>
              <p className="text-light-100 max-w-xl">
                Create a focused interview that follows the same visual language
                as the dashboard, feedback, and interview screens.
              </p>
            </div>

            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href="/">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </div>

      <InterviewCreateForm />
    </section>
  );
};

export default NewInterviewPage;
