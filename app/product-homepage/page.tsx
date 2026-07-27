import type { Metadata } from "next";
import { ProductHomepage } from "../asset-library/product-homepage/ProductHomepage";

export const metadata: Metadata = {
  title: "新华漫游志｜产品主页",
  description: "新华漫游志的产品介绍与更新日志。",
};

export default function ProductHomepagePage() {
  return <ProductHomepage />;
}
