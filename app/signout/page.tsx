"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut } from "lucide-react";

export default function SignOutPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-white/10 bg-[#0f1d32]">
        <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <LogOut className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-white">Sign Out</h1>
          <p className="text-sm text-muted-foreground text-center">
            Are you sure you want to sign out?
          </p>
          <div className="flex gap-3 w-full mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
