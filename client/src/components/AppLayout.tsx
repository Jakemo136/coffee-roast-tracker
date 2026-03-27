import { Outlet, Link } from "react-router-dom";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Coffee Roast Tracker
        </Link>
        <nav className={styles.nav}>
          <Link to="/">Dashboard</Link>
          <Link to="/beans">Beans</Link>
          <Link to="/upload">Upload</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
