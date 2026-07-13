"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

// WHY: fires the one-time success toast on the detail page after createReview
// redirects here with ?created=1 (a success toast can't survive the redirect
// from the form itself). The ref guards against double-fire in Strict Mode.
export function CreatedToast() {
  const fired = useRef(false);

  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      toast.success("تم إنشاء المراجعة ورفع الحزمة بنجاح.");
    }
  }, []);

  return null;
}
