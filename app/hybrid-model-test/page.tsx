import { HybridModelComparison } from "./HybridModelComparison";
import styles from "./hybrid-model-test.module.css";

export default function HybridModelTestPage() {
  return (
    <main className={styles.page}>
      <HybridModelComparison />
    </main>
  );
}
