import { UserButton as ClerkUserButton, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import styles from "./styles/UserButton.module.css";

const isE2e = import.meta.env.VITE_E2E_TEST === "true";

export function UserButton() {
  if (isE2e) {
    return <span className={styles.signInLink}>E2E Test User</span>;
  }

  return <ClerkUserButton_Inner />;
}

function ClerkUserButton_Inner() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <Link to="/sign-in" className={styles.signInLink}>
        Sign in
      </Link>
    );
  }

  return <ClerkUserButton />;
}
