/**
 * Background Snippets — 21st.dev adaptation (JS/JSX, dark theme)
 * Two variants:
 *  - GridBackground   : grille + gradient violet (light bg, non utilisé ici)
 *  - DarkBackground   : fond slate-950 + radial gris centré (dark theme)
 */

/** Grille fine + gradient radial violet — fond clair */
export const GridBackground = () => {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)]" />
    </div>
  );
};

/** Fond dark (slate-950) + halo radial centré — utilisé comme AppBackground */
export const DarkBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_560px_at_50%_200px,#525252,transparent)]" />
    </div>
  );
};
