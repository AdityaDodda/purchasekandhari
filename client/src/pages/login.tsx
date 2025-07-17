import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const DEFAULT_DOMAIN = "enrichagro.com";
const DEFAULT_DOMAINS_LIST = [DEFAULT_DOMAIN];

const loginSchema = z.object({
  username: z.string().min(1, "Username is required."),
  domain: z.string().min(1, "Domain is required."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {data: domains,isLoading: isLoadingDomains,
    error: domainsError,
  } = useQuery<string[]>({
    queryKey: ["domains"],
    queryFn: async () => {
      const response = await fetch("/api/auth/domains"); 
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // console.log("Frontend (RAW FETCH data from useQuery):", data); // New log for raw data
      const uniqueDomains = Array.from(new Set([...DEFAULT_DOMAINS_LIST, ...data]));
      // console.log("Frontend (Processed domains):", uniqueDomains); // Log after processing
      return uniqueDomains.sort();
    },

    onError: (err) => {
      console.error("Failed to fetch domains:", err);
      toast({
        title: "Error loading domains",
        description: "Could not fetch email domains. Using default.",
        variant: "destructive",
      });
    },
  });

  const {register,handleSubmit,setValue,watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      domain: DEFAULT_DOMAIN,
      password: "",
      rememberMe: false,
    },
  });

  const selectedDomain = watch("domain");

  useState(() => {
    if (domains && !domains.includes(selectedDomain)) {
      setValue("domain", DEFAULT_DOMAIN, { shouldValidate: true });
    }
  }, [domains, selectedDomain, setValue]);


  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const fullEmail = `${data.username}@${data.domain}`;
      const response = await apiRequest("POST", "/api/auth/login", {
        email: fullEmail,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.userNeedsPasswordReset) {
        toast({
          title: "Password Reset Required",
          description: data.message || "Please reset your password to continue.",
          variant: "default",
        });
        setLocation(`/reset-password?email=${encodeURIComponent(data.email)}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: "Welcome back!", description: "You have been logged in successfully." });
        setLocation("/");
      }
    },
    onError: (error: any) => {
      console.error("Login mutation error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
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
                Form errors:{" "}
                {Object.keys(errors)
                  .map((key) => `${key}: ${errors[key as keyof typeof errors]?.message}`)
                  .join(", ")}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative flex items-center gap-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                <Input
                  id="username"
                  {...register("username")}
                  placeholder="Enter your username"
                  className="pl-10 flex-grow"
                />
                <span className="text-gray-600 font-semibold">@</span>
                <Select
                  onValueChange={(value) => setValue("domain", value, { shouldValidate: true })}
                  value={selectedDomain}
                  disabled={isLoadingDomains || domains.length === 0}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingDomains ? (
                      <SelectItem value="loading" disabled>
                        Loading domains...
                      </SelectItem>
                    ) : domains.length === 0 ? (
                      <SelectItem value="no-domains" disabled>
                        No domains available
                      </SelectItem>
                    ) : (
                      domains.map((domain) => (
                        <SelectItem key={domain} value={domain}>
                          {domain}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
              {errors.domain && (
                <p className="text-sm text-destructive">{errors.domain.message}</p>
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
              {/* <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" {...register("rememberMe")} />
                <Label htmlFor="rememberMe" className="text-sm">
                  Remember me
                </Label>
              </div> */}
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
              disabled={loginMutation.isPending || isLoadingDomains}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>

            {/* <div className="text-center">
              <span className="text-gray-600 text-sm">Don't have an account? </span>
              <a
                href="/signup"
                className="text-sm text-[hsl(207,90%,54%)] hover:underline"
              >
                Sign up
              </a>
            </div> */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}