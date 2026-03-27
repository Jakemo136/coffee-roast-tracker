import { SignIn } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";
import styles from "./AuthPage.module.css";

export function SignInPage() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={from}
        />
      </div>
    </div>
  );
}
