import { SignIn } from "@clerk/clerk-react";
import styles from "./SignInPage.module.css";

export function SignInPage() {
  return (
    <div className={styles.container}>
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}
