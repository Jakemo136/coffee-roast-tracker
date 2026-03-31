import { Outlet, Link, NavLink } from "react-router-dom";
import { UserButton } from "./UserButton";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Coffee Roast Tracker
        </Link>
        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/beans"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
            }
          >
            Beans
          </NavLink>
          <NavLink
            to="/compare"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
            }
          >
            Compare
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
            }
          >
            Settings
          </NavLink>
        </nav>
        <div className={styles.headerRight}>
          <button type="button" className={styles.uploadButton}>Upload</button>
          <UserButton />
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
