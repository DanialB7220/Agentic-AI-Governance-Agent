import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/copilot");
  return (
    <AuthForm
      mode="signup"
      title="Create an account"
      subtitle="Your policies, reports, and chats stay with this login."
      alternate={{ href: "/login", label: "Log in instead" }}
    />
  );
}
