"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/actions/auth.action";
import Image from "next/image";

interface UserMenuProps {
  userName: string;
  profilePic?: string;
}

export default function UserMenu({ userName, profilePic = "/default-profile.png" }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/sign-in");
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile button with image */}
      <button 
        onClick={() => setOpen(!open)} 
        className="flex items-center gap-2 focus:outline-none"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-100">
          <Image
            src={profilePic}
            alt={`${userName}'s profile`}
            width={40}
            height={40}
            className="object-cover"
            unoptimized
          />
        </div>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100">
          <div className="p-1">
            <div className="px-4 py-2 text-sm text-gray-700 border-b">
              {userName}
            </div>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}