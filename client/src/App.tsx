import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/layout";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import NewRequest from "@/pages/new-request";
import MyRequests from "@/pages/my-requests";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminMasters from "@/pages/admin-masters";
import NotFound from "@/pages/not-found";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import AdminReports from "@/pages/admin-reports";
import UserReports from "@/pages/user-reports";

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route component={Login} />
      </Switch>
    );
  }

  return <>{children}</>;
}

function Router() {
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return (
    <AuthWrapper>
      <Layout>
        <Switch>
          {/* Route based on user role */}
          <Route path="/" component={user?.role === "admin" ? AdminDashboard : Dashboard} />
          <Route path="/new-request" component={NewRequest} />
          {/* Reports routing by role */}
          {user?.role === "admin" ? (
            <Route path="/reports" component={AdminReports} />
          ) : (
            <Route path="/reports" component={UserReports} />
          )}
          <Route path="/admin-reports" component={AdminReports} />
          <Route path="/user-reports" component={UserReports} />
          {user?.role === "admin" && (
            <>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin-masters" component={AdminMasters} />
            </>
          )}
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </AuthWrapper>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;