import type { Metadata } from "next";
import { StyleLab } from "./StyleLab";
import styles from "./style-lab.module.css";

export const metadata: Metadata = {
  title: "三种视觉方向｜新华漫游志",
  description: "在同一段幸福里街景中比较新华墨线档案、新华盛夏绘本和新华漫画微缩城。",
};

export default function StyleLabPage() {
  return (
    <main className={styles.page}>
      <StyleLab />
    </main>
  );
}
