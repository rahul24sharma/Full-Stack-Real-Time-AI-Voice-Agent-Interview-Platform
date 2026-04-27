import Agent from "@/components/Agent";
import { requireCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
  const user = await requireCurrentUser();

  return (
    <>
      <h3>Interview generation</h3>

      <Agent
        userName={user.name}
        userId={user.id}
        type="generate"
      />
    </>
  );
};

export default Page;
