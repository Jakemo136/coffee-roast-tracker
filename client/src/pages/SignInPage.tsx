import { SignIn } from "@clerk/clerk-react";
import styles from "./AuthPage.module.css";

export function SignInPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
