import { useState } from "react";
import { Link, useLocation } from "wouter"; // Keep Link for navigation, useLocation for programatic redirect
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react"; // Changed IdCard to Mail icon

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient"; // Assuming apiRequest handles JSON parsing

// --- MODIFIED: Login Schema to use email ---
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."), // Changed from employeeNumber
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    // --- MODIFIED: Default values for email ---
    defaultValues: {
      email: "", // Changed from employeeNumber
      password: "",
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      // The `data` object from useForm will now correctly contain `email`
      // instead of `employeeNumber` due to the schema change.
      const response = await apiRequest("POST", "/api/auth/login", data);
      // Assuming apiRequest returns a Response object, then parse it as JSON.
      // This `data` will be the parsed JSON from the server.
      return response.json();
    },
    // --- MODIFIED: onSuccess to handle userNeedsPasswordReset flag ---
    onSuccess: (data: any) => { // 'data' here is the parsed JSON response from the server
      if (data.userNeedsPasswordReset) {
        toast({
          title: "Password Reset Required",
          description: data.message || "Please reset your password to continue.",
          variant: "default", // or "warning"
        });
        // Redirect to reset password page, passing email for convenience
        setLocation(`/reset-password?email=${encodeURIComponent(data.email)}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: "Welcome back!", description: "You have been logged in successfully." });
        setLocation("/"); // Redirect to dashboard or home page
      }
    },
    onError: (error: any) => { // Type 'any' for error to access message safely
      console.error("Login mutation error:", error); // Log full error for debugging
      let errorMessage = "An unexpected error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = error.message; // Covers cases where apiRequest might wrap the error
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen kandhari-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src="/assets/cola.png" alt="cola" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 mt-2">Sign in to your Purchase Request System</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {Object.keys(errors).length > 0 && (
              <div className="text-red-500 text-sm">
                Form errors: {Object.keys(errors).map(key => `${key}: ${errors[key as keyof typeof errors]?.message}`).join(', ')}
              </div>
            )}

            <div className="space-y-2">
              {/* --- MODIFIED: Input for Email Address --- */}
              <Label htmlFor="email">Email Address</Label> {/* Changed label */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" /> {/* Changed icon */}
                <Input
                  id="email" // Changed ID
                  {...register("email")} // Registered with 'email'
                  placeholder="Enter your email address" // Changed placeholder
                  className="pl-10"
                />
              </div>
              {errors.email && ( // Error for 'email'
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="password"
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" {...register("rememberMe")} />
                <Label htmlFor="rememberMe" className="text-sm">
                  Remember me
                </Label>
              </div>
              <a 
                href="/forgot-password" 
                className="text-sm text-[hsl(207,90%,54%)] hover:underline"
                tabIndex={-1}
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center">
              <span className="text-gray-600 text-sm">Don't have an account? </span>
              <a 
                href="/signup" 
                className="text-sm text-[hsl(207,90%,54%)] hover:underline"
              >
                Sign up
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}