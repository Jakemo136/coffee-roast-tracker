import { SignUp } from "@clerk/clerk-react";
import styles from "./SignUpPage.module.css";

export function SignUpPage() {
  return (
    <div className={styles.container}>
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}
