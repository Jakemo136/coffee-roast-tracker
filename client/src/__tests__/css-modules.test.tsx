import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import styles from "./CssModulesTest.module.css";

describe("CSS Modules + CSS Variables", () => {
  it("imports CSS module classes as scoped strings", () => {
    expect(typeof styles.container).toBe("string");
    expect(typeof styles.title).toBe("string");
  });

  it("renders with CSS module classes applied", () => {
    render(
      <div className={styles.container}>
        <h1 className={styles.title}>Styled heading</h1>
      </div>
    );
    const heading = screen.getByText("Styled heading");
    expect(heading).toBeInTheDocument();
    expect(heading.className).toBe(styles.title);
  });
});
