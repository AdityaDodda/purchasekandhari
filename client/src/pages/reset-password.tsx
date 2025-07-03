import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const formSchema = z
  .object({
    password: z.string().min(6, {message: "Password must be at least 6 characters.",}),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');

      if (!email) {
        throw new Error("Invalid reset link. Please try again.");
      }

      const res = await fetch(`/api/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password: values.password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      navigate("/login");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex flex-col items-center space-y-2 text-center">
            <img src="/assets/cola.png" alt="cola" />
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-gray-500 dark:text-gray-400">
            As you are first time logging in you have to reset password.
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
} 