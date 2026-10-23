import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/copilot");
  return (
    <AuthForm
      mode="login"
      title="Log in"
      subtitle="Open the workspace saved to your account."
      alternate={{ href: "/signup", label: "Create an account" }}
    />
  );
}
