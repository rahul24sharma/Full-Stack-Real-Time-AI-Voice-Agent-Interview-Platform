// import Link from "next/link";
// import Image from "next/image";
// import { ReactNode } from "react";
// import { redirect } from "next/navigation";

// import { isAuthenticated } from "@/lib/actions/auth.action";

// const Layout = async ({ children }: { children: ReactNode }) => {
//   const isUserAuthenticated = await isAuthenticated();
//   if (!isUserAuthenticated) redirect("/sign-in");

//   return (
//     <div className="root-layout">
//       <nav>
//         <Link href="/" className="flex items-center gap-2">
//           <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
//           <h2 className="text-primary-100">PrepWise</h2>
//         </Link>
//       </nav>

//       {children}
//     </div>
//   );
// };

// export default Layout;
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import UserMenu from "@/components/ui/UserMenu";
import Image from "next/image";
import Link from "next/link";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="root-layout">
      <nav className="flex justify-between items-center p-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="PrepWise Logo" width={38} height={32} />
          <h2 className="text-primary-100">PrepWise</h2>
        </Link>

        <UserMenu 
          userName={user.name} 
          profilePic={user.profilePic} 
        />
      </nav>

      {children}
    </div>
  );
};

export default Layout;
