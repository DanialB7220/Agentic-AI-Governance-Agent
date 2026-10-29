import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.workspace === "blank" ? "/onboarding" : "/copilot");
  }
  return (
    <AuthForm
      mode="login"
      title="Log in"
      subtitle="admin / admin = seeded demo. admin1 / admin1 or any new account = empty onboarding."
      alternate={{ href: "/signup", label: "Create an account" }}
    />
  );
}
