import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.workspace === "blank" ? "/onboarding" : "/copilot");
  }
  return (
    <AuthForm
      mode="signup"
      title="Create an account"
      subtitle="Start empty: name your org, add policies, then load sample regulations in one click. Your data stays with this login."
      alternate={{ href: "/login", label: "Log in instead" }}
    />
  );
}
