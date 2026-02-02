/**
 * AriaLiveRegion Component
 *
 * Provides an ARIA live region for announcing dynamic content changes
 * to screen reader users.
 */

import React, { useState, useEffect, useCallback } from "react";

type Politeness = "polite" | "assertive" | "off";

interface AriaLiveRegionProps {
  message: string;
  politeness?: Politeness;
  clearAfter?: number;
}

export const AriaLiveRegion: React.FC<AriaLiveRegionProps> = ({
  message,
  politeness = "polite",
  clearAfter = 5000,
}) => {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (message) {
      // Clear first to ensure re-announcement of same message
      setAnnouncement("");

      // Small delay to ensure screen readers pick up the change
      const timeout = setTimeout(() => {
        setAnnouncement(message);
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [message]);

  useEffect(() => {
    if (announcement && clearAfter > 0) {
      const timeout = setTimeout(() => {
        setAnnouncement("");
      }, clearAfter);

      return () => clearTimeout(timeout);
    }
  }, [announcement, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

// Hook for programmatic announcements
interface UseAriaAnnounceReturn {
  announce: (message: string, politeness?: Politeness) => void;
  AnnouncementRegion: React.FC;
}

export const useAriaAnnounce = (): UseAriaAnnounceReturn => {
  const [message, setMessage] = useState("");
  const [politeness, setPoliteness] = useState<Politeness>("polite");

  const announce = useCallback((msg: string, pol: Politeness = "polite") => {
    setPoliteness(pol);
    setMessage(msg);
  }, []);

  const AnnouncementRegion: React.FC = () => (
    <AriaLiveRegion message={message} politeness={politeness} />
  );

  return { announce, AnnouncementRegion };
};

export default AriaLiveRegion;
