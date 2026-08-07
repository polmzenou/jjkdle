/**
 * DÉCOR DU CASINO — le tapis, posé une fois pour toutes derrière tout
 * /casino/* (monté par app/casino/layout.tsx).
 *
 * 100 % CSS et aucune image : même discipline que `PlayingCard` et les dos de
 * carte (lib/casino/skins.ts). Un fond de casino en JPEG serait la plus grosse
 * requête de la page, arriverait après le contenu, et ne suivrait pas la palette
 * — ici tout est peint à partir des variables du thème casino
 * (`--color-domain` = le feutre, `--color-cursed` = l'or, cf. CASINO_THEME dans
 * lib/universes/theme.ts). Changer la palette change le décor, sans retouche.
 *
 * Le calque est `fixed`, `-z-10`, `pointer-events-none` et `aria-hidden` : il ne
 * défile pas, ne capte aucun clic et n'existe pas pour un lecteur d'écran. Il ne
 * porte AUCUNE animation JS — uniquement `animate-float`, une transformation CSS
 * qui reste sur le compositeur, parce qu'une table de casino tourne parfois
 * plusieurs minutes sur le même écran et qu'un décor n'a pas le droit de coûter
 * une frame au jeu.
 */

/**
 * Enseignes de couleur qui flottent au loin. Positions figées et non aléatoires :
 * un tirage au rendu donnerait un décor différent entre le serveur et le client
 * (erreur d'hydratation), et surtout un décor qui saute à chaque navigation.
 */
const SUITS = [
  { symbol: "♠", top: "6%", left: "4%", size: "text-[7rem]", delay: "0s" },
  { symbol: "♥", top: "14%", left: "86%", size: "text-[9rem]", delay: "-1.4s" },
  { symbol: "♦", top: "46%", left: "10%", size: "text-[6rem]", delay: "-2.8s" },
  { symbol: "♣", top: "62%", left: "80%", size: "text-[8rem]", delay: "-4.2s" },
  { symbol: "♠", top: "84%", left: "22%", size: "text-[5rem]", delay: "-3.1s" },
  { symbol: "♥", top: "78%", left: "58%", size: "text-[6rem]", delay: "-0.7s" },
];

export function CasinoBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 1. Le feutre : halo vert qui descend du haut, remonté d'un fond de
             salle plus sombre. C'est ce qui donne l'impression d'être AUTOUR
             d'une table plutôt que devant une page. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 75% at 50% -10%, rgb(var(--color-domain) / 0.30) 0%, rgb(var(--color-domain) / 0.10) 40%, transparent 72%)",
        }}
      />

      {/* 2. Le halo doré du lustre, au-dessus de la table. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 35% at 50% -5%, rgb(var(--color-cursed) / 0.20) 0%, transparent 70%)",
        }}
      />

      {/* 3. Le bord de la table : une ellipse démesurée, dont on ne voit que la
             courbe supérieure. Le liseré doré est la tranche du tapis. */}
      <div
        className="absolute left-1/2 top-[22vh] h-[85vh] w-[190vw] -translate-x-1/2 rounded-[50%] border border-cursed/15"
        style={{
          background:
            "radial-gradient(closest-side, rgb(var(--color-domain) / 0.22) 0%, rgb(var(--color-domain) / 0.08) 70%, transparent 100%)",
          boxShadow:
            "inset 0 2px 40px rgb(var(--color-cursed) / 0.10), 0 -20px 80px -40px rgb(var(--color-domain) / 0.6)",
        }}
      />

      {/* 4. La trame du feutre : deux hachures croisées, très basses en opacité.
             C'est le grain qui distingue un tapis d'un aplat de couleur. */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.55) 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.35) 0 1px, transparent 1px 6px)",
        }}
      />

      {/* 5. Les enseignes de couleur, en filigrane. */}
      {SUITS.map((suit, index) => (
        <span
          key={`${suit.symbol}-${index}`}
          className={`absolute select-none font-display leading-none text-white/[0.035] animate-float ${suit.size}`}
          style={{
            top: suit.top,
            left: suit.left,
            animationDelay: suit.delay,
          }}
        >
          {suit.symbol}
        </span>
      ))}

      {/* 6. Vignette, EN DERNIER : elle assombrit tout ce qui précède pour
             ramener l'œil au centre, là où se joue la main. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(105% 85% at 50% 38%, transparent 40%, rgb(0 0 0 / 0.45) 78%, rgb(0 0 0 / 0.72) 100%)",
        }}
      />
    </div>
  );
}
