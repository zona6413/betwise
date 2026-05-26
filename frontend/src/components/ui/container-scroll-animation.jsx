import React, { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export const ContainerScroll = ({ titleComponent, children }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scaleDimensions = () => isMobile ? [0.7, 0.9] : [1.05, 1];

  const rotate    = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale     = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      ref={containerRef}
      style={{ height: "80rem", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "1rem" }}
    >
      <div style={{ paddingTop: "10rem", paddingBottom: "10rem", width: "100%", position: "relative", perspective: "1000px" }}>
        <ScrollHeader translate={translate} titleComponent={titleComponent} />
        <ScrollCard rotate={rotate} scale={scale}>
          {children}
        </ScrollCard>
      </div>
    </div>
  );
};

export const ScrollHeader = ({ translate, titleComponent }) => (
  <motion.div
    style={{ translateY: translate, textAlign: "center", maxWidth: "64rem", margin: "0 auto" }}
  >
    {titleComponent}
  </motion.div>
);

export const ScrollCard = ({ rotate, scale, children }) => (
  <motion.div
    style={{
      rotateX: rotate,
      scale,
      marginTop: "-3rem",
      maxWidth: "64rem",
      margin: "-3rem auto 0",
      height: "40rem",
      width: "100%",
      border: "1px solid rgba(234,179,8,0.25)",
      background: "#0C0F18",
      borderRadius: "24px",
      padding: "8px",
      boxShadow: "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 0 40px rgba(234,179,8,0.08)",
    }}
  >
    <div style={{ height: "100%", width: "100%", overflow: "hidden", borderRadius: "18px", background: "#080B12" }}>
      {children}
    </div>
  </motion.div>
);
