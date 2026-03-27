import { UserButton as ClerkUserButton, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import styles from "./UserButton.module.css";

export function UserButton() {
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
