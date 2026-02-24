import { redirect } from "next/navigation";

// Legacy admin-login route — redirect to unified /login
export default async function AdminLoginPage() {
  redirect("/login");
}
