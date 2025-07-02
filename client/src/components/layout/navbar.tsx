import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {Bell, User, ChevronDown, LogOut, Home, FileText, ClipboardCheck, BarChart3, Database} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, formatDateTime } from "@/lib/utils";

export function Navbar() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.removeQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.removeQueries({ queryKey: ["/api/purchase-requests"] });

      toast({ title: "Logged out", description: "You have been logged out successfully." });
      window.location.href = "/";
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNavigation = (path: string) => setLocation(path);
  const handleLogout = () => logoutMutation.mutate();

  return (
    <nav className="bg-[hsl(207,90%,54%)] shadow-md fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Section */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <img 
                src="/assets/cola.png" 
                alt="Coca-Cola Logo" 
                className="h-10 w-auto max-w-[100px] object-contain"
                onError={(e) => {
                  console.error('Logo failed to load from /assets/cola.png');
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="text-white font-bold text-sm bg-red-600 px-2 py-1 rounded">LOGO</span>';
                  }
                }}
                onLoad={() => console.log('Logo loaded successfully')}
              />
            </div>
            <span className="text-white font-extrabold text-xl tracking-wide hover:text-[hsla(6,100%,50%,1)] transition-colors ml-3">
              KGBPL
            </span>
          </div>

          {/* Navigation Section */}
          <div className="flex items-center justify-center space-x-1 md:space-x-4">
            <NavButton icon={<Home className="h-5 w-5 text-white mr-2" />} label="Dashboard" onClick={() => handleNavigation("/")} />
            <NavButton icon={<FileText className="h-5 w-5 text-white mr-2" />} label="New Request" onClick={() => handleNavigation("/new-request")} />
            {/* <NavButton icon={<List className="h-5 w-5 text-white mr-2" />} label="Requests" onClick={() => handleNavigation("/my-requests")} /> */}
            <NavButton icon={<BarChart3 className="h-5 w-5 text-white mr-2" />} label="Reports" onClick={() => handleNavigation("/reports")} />
            {user?.role === "admin" && (
              <NavButton icon={<Database className="h-5 w-5 text-white mr-2" />} label="Masters" onClick={() => handleNavigation("/admin-masters")} />
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-6">
            {/* User Dropdown */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center space-x-2 text-white hover:text-[hsl(32,100%,50%)] hover:bg-white/10 transition-colors duration-200 whitespace-nowrap"
                  >
                    <div className="w-8 h-8 bg-[hsl(32,100%,50%)] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U'}
                      </span>
                    </div>
                    <span className="hidden md:inline truncate max-w-[120px]">{user?.name ?? 'User'}</span>
                    <ChevronDown className="h-4 w-4 text-white flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 mt-2"
                  sideOffset={5}
                  alignOffset={-5}
                >
                  <div className="px-2 py-1.5 text-sm">
                    <div className="font-medium truncate">{user?.fullName ?? 'User'}</div>
                    <div className="text-gray-500 truncate">{user?.email ?? 'No email'}</div>
                    <div className="text-gray-500 text-xs">{user?.employeeNumber ?? 'N/A'}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {logoutMutation.isPending ? "Logging out..." : "Logout"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavButton({ icon, label, onClick }: { icon: JSX.Element; label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      className="text-white hover:text-[hsl(32,100%,50%)] hover:bg-transparent px-2 py-2 text-sm font-medium flex items-center"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}