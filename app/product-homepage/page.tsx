import type { Metadata } from "next";
import { ProductHomepage } from "../asset-library/product-homepage/ProductHomepage";

export const metadata: Metadata = {
  title: "漫步新华｜产品主页",
  description: "漫步新华的产品介绍与更新日志。",
};

export default function ProductHomepagePage() {
  return <ProductHomepage />;
}
