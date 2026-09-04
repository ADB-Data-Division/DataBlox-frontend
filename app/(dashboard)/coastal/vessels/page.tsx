import { Suspense } from "react";
import PageContent from "./page-content";

export const metadata = {
  title: "Maritime Vessel Types Analysis | DataBlox",
};

export default function VesselsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
