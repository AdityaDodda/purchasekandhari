import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  completed: boolean;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: number;
}

export function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold",
                step.number === currentStep
                  ? "bg-[hsl(207,90%,54%)] text-white"
                  : step.number < currentStep
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              )}
            >
              {step.number < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                "ml-2 text-sm font-medium",
                step.number === currentStep
                  ? "text-[hsl(207,90%,54%)]"
                  : step.number < currentStep
                  ? "text-green-600"
                  : "text-gray-500"
              )}
            >
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-4",
                step.number < currentStep ? "bg-green-500" : "bg-gray-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
