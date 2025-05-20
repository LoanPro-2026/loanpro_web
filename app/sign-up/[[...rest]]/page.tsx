// app/sign-up/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex justify-center mt-10">
      <SignUp />
    </div>
  );
}
