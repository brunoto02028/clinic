import { redirect } from "next/navigation";

// Redirect to the unified login page
export default function AdminLoginRedirect() {
  redirect("/login");
}
