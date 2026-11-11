import { cn } from "@/lib/utils";

export function Input(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn("field", props.className)} />;
}

export function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cn("field min-h-20", props.className)} />;
}

export function Select(props: React.ComponentProps<"select">) {
  return <select {...props} className={cn("field", props.className)} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label {...props} className={cn("mb-1 block text-sm text-[#5c5346]", className)} />;
}
