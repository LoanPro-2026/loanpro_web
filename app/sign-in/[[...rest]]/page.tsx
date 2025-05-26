// app/sign-in/page.tsx
import { SignedIn, SignedOut, SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function SignInPage() {
  return (
    <div className="flex justify-center mt-10">
      <SignedIn>
        {/* Redirect signed-in users to dashboard */}
        {redirect("/app/dashboard")}
      </SignedIn>
      <SignedOut>
        <SignIn />
      </SignedOut>
    </div>
  );
}
