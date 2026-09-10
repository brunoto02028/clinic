import type { Metadata } from "next";
import StudentWorkouts from "@/components/workouts/student-workouts";

export const metadata: Metadata = {
  title: "My Workouts",
  robots: { index: false, follow: false },
};

export default function WorkoutsPage() {
  return <StudentWorkouts />;
}
