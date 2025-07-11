import { schedule, ScheduledTask } from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { storage } from './storage';

const prisma = new PrismaClient();

interface EscalationState {
  pr_number: string;
  current_level: number;
  current_approver: string | null;
  escalation_level: number;
  last_approval_time: Date | null;
  escalation_time: Date | null;
  status: 'pending' | 'escalated' | 'approved' | 'rejected';
}

class EscalationService {
  private cronJob: ScheduledTask | null = null;

  constructor() {
    this.initializeCronJob();
  }

  private initializeCronJob() {
    // Run every 1 minute to check for escalations
    this.cronJob = schedule('*/1 * * * *', () => {
      this.checkEscalations();
    }, {
      timezone: "Asia/Kolkata" // Adjust to your timezone
    });

    this.cronJob.start();
    console.log('Escalation service started');
  }

  private isSunday(date: Date): boolean {
    return date.getDay() === 0; // 0 is Sunday
  }

  private addBusinessHours(date: Date, hours: number): Date {
    let result = new Date(date);
    let hoursToAdd = hours;
    
    while (hoursToAdd > 0) {
      result = new Date(result.getTime() + 60 * 60 * 1000); // Add 1 hour
      
      // Skip Sundays
      if (!this.isSunday(result)) {
        hoursToAdd--;
      }
    }
    
    return result;
  }

  private getHoursSince(date: Date, excludeSundays: boolean = true): number {
    const now = new Date();
    let hours = 0;
    let current = new Date(date);
    
    while (current < now) {
      current = new Date(current.getTime() + 60 * 60 * 1000); // Add 1 hour
      if (!excludeSundays || !this.isSunday(current)) {
        hours++;
      }
    }
    
    return hours;
  }

  private async checkEscalations() {
    try {
      // Get all pending purchase requests
      const pendingRequests = await prisma.purchase_requests.findMany({
        where: {
          status: 'pending'
        },
        include: {
          escalation_matrix: true,
          pr_escalation_logs: {
            orderBy: {
              escalated_at: 'desc'
            }
          }
        }
      });

      for (const request of pendingRequests) {
        await this.processEscalation(request);
      }
    } catch (error) {
      console.error('Error checking escalations:', error);
    }
  }

  private async processEscalation(request: any) {
    const escalationMatrix = request.escalation_matrix;
    if (!escalationMatrix) {
      console.log(`No escalation matrix found for PR ${request.pr_number}`);
      return;
    }

    const currentLevel = request.current_approval_level || 1;
    const currentApprover = request.current_approver_emp_code;
    const lastEscalationLog = request.pr_escalation_logs[0];

    // Check if we need to escalate based on current level
    if (currentLevel === 1) {
      await this.checkLevel1Escalation(request, escalationMatrix, lastEscalationLog);
    } else if (currentLevel === 2) {
      await this.checkLevel2Escalation(request, escalationMatrix, lastEscalationLog);
    } else if (currentLevel === 3) {
      await this.checkLevel3Timeout(request, escalationMatrix, lastEscalationLog);
    }
  }

  private async checkLevel1Escalation(request: any, escalationMatrix: any, lastEscalationLog: any) {
    const currentApprover = request.current_approver_emp_code;
    
    // If already escalated to manager_1, don't escalate again
    if (lastEscalationLog && lastEscalationLog.level === 1 && lastEscalationLog.status === 'escalated') {
      return;
    }

    // TESTING: escalate after 1 minute
    const minutesSinceCreation = (new Date().getTime() - new Date(request.created_at).getTime()) / (1000 * 60);
    console.log(`[TEST] Minutes since creation for PR ${request.pr_number}:`, minutesSinceCreation);
    if (minutesSinceCreation >= 1) {
      console.log(`[TEST] Escalating PR ${request.pr_number} to manager_1 after 1 minute`);
      await this.escalateToManager1(request, escalationMatrix);
    }
  }

  private async checkLevel2Escalation(request: any, escalationMatrix: any, lastEscalationLog: any) {
    const currentApprover = request.current_approver_emp_code;
    if (lastEscalationLog && lastEscalationLog.level === 2 && lastEscalationLog.status === 'escalated') {
      return;
    }
    // Find when approver_1 OR manager_1 approved (to calculate time since then)
    const approver1OrManager1ApprovalLog = await prisma.audit_logs.findFirst({
      where: {
        pr_number: request.pr_number,
        approver_emp_code: {
          in: [escalationMatrix.approver_1_code, escalationMatrix.manager_1_code]
        },
        action: 'approved'
      },
      orderBy: {
        acted_at: 'desc'
      }
    });
    if (!approver1OrManager1ApprovalLog) {
      console.log(`[TEST] No approver_1 or manager_1 approval found for PR ${request.pr_number}`);
      return;
    }
    // TESTING: escalate after 1 minute
    const actedAt = approver1OrManager1ApprovalLog.acted_at ? new Date(approver1OrManager1ApprovalLog.acted_at) : new Date(0);
    const minutesSinceApproval = (new Date().getTime() - actedAt.getTime()) / (1000 * 60);
    console.log(`[TEST] Minutes since approver_1 or manager_1 approval for PR ${request.pr_number}:`, minutesSinceApproval);
    if (minutesSinceApproval >= 1) {
      console.log(`[TEST] Escalating PR ${request.pr_number} to manager_2 after 1 minute`);
      await this.escalateToManager2(request, escalationMatrix);
    }
  }

  private async checkLevel3Timeout(request: any, escalationMatrix: any, lastEscalationLog: any) {
    // Find when approver_2 OR manager_2 approved
    const approver2OrManager2ApprovalLog = await prisma.audit_logs.findFirst({
      where: {
        pr_number: request.pr_number,
        approver_emp_code: {
          in: [escalationMatrix.approver_2_code, escalationMatrix.manager_2_code]
        },
        action: 'approved'
      },
      orderBy: {
        acted_at: 'desc'
      }
    });
    if (!approver2OrManager2ApprovalLog) {
      console.log(`[TEST] No approver_2 or manager_2 approval found for PR ${request.pr_number}`);
      return;
    }
    // TESTING: escalate after 1 minute
    const actedAt = approver2OrManager2ApprovalLog.acted_at ? new Date(approver2OrManager2ApprovalLog.acted_at) : new Date(0);
    const minutesSinceApproval = (new Date().getTime() - actedAt.getTime()) / (1000 * 60);
    console.log(`[TEST] Minutes since approver_2 or manager_2 approval for PR ${request.pr_number}:`, minutesSinceApproval);
    if (minutesSinceApproval >= 1) {
      console.log(`[TEST] Rejecting PR ${request.pr_number} after 1 minute at level 3`);
      await this.rejectRequest(request, '[TEST] Request automatically rejected after 1 minute at level 3');
    }
  }

  private async escalateToManager1(request: any, escalationMatrix: any) {
    try {
      // Create escalation log
      await prisma.pr_escalation_logs.create({
        data: {
          pr_number: request.pr_number,
          level: 1,
          status: 'escalated',
          escalated_at: new Date(),
          email_sent_to: escalationMatrix.manager_1_mail,
          comment: 'Escalated to manager_1 after 12 hours without approval from approver_1'
        }
      });

      // Update purchase request to allow both approver_1 and manager_1 to approve
      await prisma.purchase_requests.update({
        where: { pr_number: request.pr_number },
        data: {
          current_approval_level: 1,
          current_approver_emp_code: null, // Allow both to approve
          updated_at: new Date()
        }
      });

      console.log(`Escalated PR ${request.pr_number} to manager_1`);
      
      // TODO: Send email notification to manager_1
      // await sendEscalationEmail(escalationMatrix.manager_1_mail, request.pr_number, 'manager_1');
      
    } catch (error) {
      console.error(`Error escalating PR ${request.pr_number} to manager_1:`, error);
    }
  }

  private async escalateToManager2(request: any, escalationMatrix: any) {
    try {
      // Create escalation log
      await prisma.pr_escalation_logs.create({
        data: {
          pr_number: request.pr_number,
          level: 2,
          status: 'escalated',
          escalated_at: new Date(),
          email_sent_to: escalationMatrix.manager_2_mail,
          comment: 'Escalated to manager_2 after 12 hours without approval from approver_2'
        }
      });

      // Update purchase request to allow both approver_2 and manager_2 to approve
      await prisma.purchase_requests.update({
        where: { pr_number: request.pr_number },
        data: {
          current_approval_level: 2,
          current_approver_emp_code: null, // Allow both to approve
          updated_at: new Date()
        }
      });

      console.log(`Escalated PR ${request.pr_number} to manager_2`);
      
      // TODO: Send email notification to manager_2
      // await sendEscalationEmail(escalationMatrix.manager_2_mail, request.pr_number, 'manager_2');
      
    } catch (error) {
      console.error(`Error escalating PR ${request.pr_number} to manager_2:`, error);
    }
  }

  private async rejectRequest(request: any, reason: string) {
    try {
      // Create escalation log
      await prisma.pr_escalation_logs.create({
        data: {
          pr_number: request.pr_number,
          level: 3,
          status: 'rejected',
          escalated_at: new Date(),
          comment: reason
        }
      });

      // Update purchase request status to rejected
      await prisma.purchase_requests.update({
        where: { pr_number: request.pr_number },
        data: {
          status: 'rejected',
          current_approval_level: null,
          current_approver_emp_code: null,
          updated_at: new Date()
        }
      });

      console.log(`Rejected PR ${request.pr_number}: ${reason}`);
      
      // TODO: Send email notification to requester
      // await sendRejectionEmail(request.requester_emp_code, request.pr_number, reason);
      
    } catch (error) {
      console.error(`Error rejecting PR ${request.pr_number}:`, error);
    }
  }

  // Method to manually trigger escalation check (for testing)
  public async manualEscalationCheck() {
    await this.checkEscalations();
  }

  // Method to stop the escalation service
  public stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Escalation service stopped');
    }
  }
}

// Create and export the escalation service instance
export const escalationService = new EscalationService();

// Export the class for testing purposes
export { EscalationService }; 