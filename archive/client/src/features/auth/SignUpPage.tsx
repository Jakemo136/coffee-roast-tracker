import { SignUp } from "@clerk/clerk-react";
import styles from "./styles/AuthPage.module.css";

export function SignUpPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
