import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      emp_code: string;
      employeeNumber: string;
      fullName: string;
      email: string;
      department: string;
      location: string;
      role: string;
    };
  }
}