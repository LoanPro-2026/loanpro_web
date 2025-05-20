// app/sign-in/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex justify-center mt-10">
      <SignIn />
    </div>
  );
}
