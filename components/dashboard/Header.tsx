"use client";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import SearchIconHeader from "@/components/icons/SearchIconHeader";
import DropdownChevronIcon from "@/components/icons/DropdownChevronIcon";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { navigationItems } from "./Sidebar";
import type { UserProfileData } from "@/types/schema";
import LogoutButton from "@/components/auth/LogoutButton";

interface HeaderProps {
  userProfile: UserProfileData;
  onSearch?: (query: string) => void;
  title?: string;
}

export function Header({ userProfile, onSearch, title = "Dashboard" }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  return (
    <>
      {/* Mobile top bar with centered logo and hamburger on right */}
      <div className="md:hidden relative px-4 py-3 bg-white">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-[40px] h-[40px]">
              <img 
                src="/images/logo.jpg" 
                alt="QuickDate Logo" 
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <span className="text-brand text-black">QuickDate</span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Open Menu"
          onClick={() => setMenuOpen(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#f5f5f5]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="#4b164c" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="relative bg-white rounded-b-3xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] p-5">
            <div className="relative flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-[40px] h-[40px]">
                  <img 
                    src="/images/logo.jpg" 
                    alt="QuickDate Logo" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <span className="text-brand text-black">QuickDate</span>
              </div>
              <button
                type="button"
                aria-label="Close Menu"
                onClick={() => setMenuOpen(false)}
                className="absolute right-0 p-2 rounded-lg bg-[#f5f5f5]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="#4b164c" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <nav className="mt-4 flex flex-col gap-3">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className={`justify-start gap-3 px-2 hover:bg-transparent h-auto w-full ${
                        isActive ? "text-nav-active" : "text-nav text-black"
                      }`}
                    >
                      <Icon className="size-7 min-w-7" color={isActive ? "#7166f9" : "rgba(87, 83, 83, 0.87)"} />
                      <span className={`text-[16px] ${isActive ? "text-nav-active font-semibold" : "text-nav"}`}>
                        {item.label}
                      </span>
                    </Button>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4">
              <LogoutButton variant="outline" size="sm" className="w-full" />
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 lg:gap-10 xl:gap-[141px] px-4 md:px-8 lg:px-6 xl:px-8 py-3 md:py-4 lg:py-3 bg-white">
        <div className="flex items-center justify-between md:block">
          <h1 className="text-[28px] md:text-[36px] lg:text-[32px] font-medium text-[#4b164c] leading-[36px] md:leading-[42px] lg:leading-[38px]" style={{ fontFamily: 'Roboto, sans-serif' }}>
            {title}
          </h1>
          
          {/* User profile on mobile - positioned on the right */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger id="header-user-menu-trigger-mobile" className="flex items-center outline-none">
                <Avatar className="w-[38px] h-[40px] rounded-[12px] flex-shrink-0">
                  <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} className="object-cover" />
                  <AvatarFallback>{userProfile.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-[18px] font-medium text-black ml-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {userProfile.name}
                </span>
                <div className="ml-4 bg-[#f5f5f5] rounded-[12px] p-2 flex items-center justify-center">
                  <DropdownChevronIcon width={24} height={24} className="text-black" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <div className="px-1 py-1">
                  <LogoutButton variant="ghost" size="sm" className="w-full justify-start" />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:flex-1">
          <Input
            type="text"
            placeholder="Type anything to search...."
            className="w-full md:w-[270px] lg:w-[220px] xl:w-[270px] h-[46px] lg:h-[42px] px-3 rounded-lg border border-gray-200 bg-[#f5f5f5] text-[15px] font-normal placeholder:text-[rgba(0,0,0,0.33)]"
            style={{ fontFamily: 'Roboto, sans-serif' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if ((e as React.KeyboardEvent<HTMLInputElement>).key === 'Enter') { onSearch?.(searchQuery); } }}
          />
          <button 
            type="button" 
            className="flex items-center justify-center w-[50px] lg:w-[44px] h-[46px] lg:h-[42px] rounded-lg bg-[#f5f5f5] flex-shrink-0" 
            aria-label="Search"
            onClick={() => onSearch?.(searchQuery)}
          >
            <SearchIconHeader width={24} height={23} color="#4b164c" />
          </button>
        </div>
        
        {/* User profile on desktop - positioned on the right */}
        <div className="hidden md:block md:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger id="header-user-menu-trigger-desktop" className="flex items-center outline-none ml-auto">
              <Avatar className="w-[43px] h-[45px] lg:w-[38px] lg:h-[40px] rounded-[12px] flex-shrink-0">
                <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} className="object-cover" />
                <AvatarFallback>{userProfile.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-[20px] lg:text-[18px] font-medium text-black ml-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                {userProfile.name}
              </span>
              <div className="ml-[67px] lg:ml-6 xl:ml-[67px] bg-[#f5f5f5] rounded-[12px] p-2 flex items-center justify-center">
                <DropdownChevronIcon width={24} height={24} className="text-black" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <div className="px-1 py-1">
                <LogoutButton variant="ghost" size="sm" className="w-full justify-start" />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Purple separator line */}
      <div className="h-[2px] bg-[#b866f9]" />
    </>
  );
}