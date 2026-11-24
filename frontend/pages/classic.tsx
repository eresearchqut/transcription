import { useRouter } from "next/router";
import { useEffect } from "react";

/** The classic upload view was removed. Send old bookmarks to the guided view. */
const Classic = () => {
  const router = useRouter();
  useEffect(() => {
    void router.replace("/");
  }, [router]);
  return null;
};

export default Classic;
