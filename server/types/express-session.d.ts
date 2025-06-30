import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      employeeNumber: string;
      fullName: string;
      email: string;
      department: string;
      location: string;
      role: string;
    };
  }
}