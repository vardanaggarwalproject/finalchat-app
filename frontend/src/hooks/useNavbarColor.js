import { useState, useEffect } from "react";

const useNavbarColor = (height) => {
  const [navColor, setNavColor] = useState("rgba(146, 144, 195, 0.95)"); // Soft purple from SVG
  const [borderColor, setBorderColor] = useState("rgba(146, 144, 195, 0.3)");
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollHeight = height ?? 20;

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      if (scrollY >= scrollHeight) {
        setNavColor("rgba(228, 228, 228, 0.98)"); // Smoke/gray color
        setBorderColor("rgba(146, 144, 195, 0.5)"); // Purple border
        setIsScrolled(true);
      } else {
        setNavColor("rgba(146, 144, 195, 0.95)"); // Soft purple
        setBorderColor("rgba(146, 144, 195, 0.3)");
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { navColor, borderColor, isScrolled };
};

export default useNavbarColor;
