export type RitualType = "ward" | "bless" | "sparkle" | "chime";

export type Charm = {
  id: string;
  emoji: string;
  name: string;
  ritual: RitualType;
  region: string;
  description: string;
  actionLabel: string;
};

export const DEFAULT_CHARMS: Charm[] = [
  {
    id: "nazar",
    emoji: "🧿",
    name: "Nazar Boncuğu",
    ritual: "ward",
    region: "Turkey & the Levant",
    description:
      "A blue glass eye, layered like a gaze fixed back at the world. Give it a spin to send envy back where it came from.",
    actionLabel: "Spin it once",
  },
  {
    id: "hamsa",
    emoji: "🪬",
    name: "Hamsa",
    ritual: "bless",
    region: "Middle East & North Africa",
    description:
      "An open hand carried for protection and good fortune. Give it a flick to send bad luck on its way.",
    actionLabel: "Give it a flick",
  },
  {
    id: "clover",
    emoji: "🍀",
    name: "Four-Leaf Clover",
    ritual: "sparkle",
    region: "Ireland",
    description:
      "One leaf in ten thousand, kept for the luck the other three never had. Rub it for a little of that luck to rub off.",
    actionLabel: "Rub for luck",
  },
  {
    id: "maneki-neko",
    emoji: "🐱",
    name: "Maneki-neko",
    ritual: "chime",
    region: "Japan",
    description:
      "The beckoning cat, paw raised to wave fortune and customers through the door. Tap its paw to set it waving.",
    actionLabel: "Tap its paw",
  },
  {
    id: "scarab",
    emoji: "🪲",
    name: "Scarab",
    ritual: "sparkle",
    region: "Egypt",
    description:
      "Carved in the likeness of the beetle that rolled the sun across the sky each day. Turn it over to greet the next sunrise early.",
    actionLabel: "Turn it over",
  },
  {
    id: "ganesha",
    emoji: "🐘",
    name: "Ganesha",
    ritual: "ward",
    region: "India",
    description:
      "Remover of obstacles, invoked before anything new begins. Give him a nod before you start your next task.",
    actionLabel: "Clear the path",
  },
  {
    id: "fu",
    emoji: "福",
    name: "Fu",
    ritual: "bless",
    region: "China",
    description:
      "The character for fortune, often hung upside down since 'upside-down' and 'arrived' sound alike. Flip it to let luck in the door.",
    actionLabel: "Flip it upside down",
  },
  {
    id: "nimbu-mirchi",
    emoji: "🌶️🍋",
    name: "Nimbu-mirchi",
    ritual: "ward",
    region: "India",
    description:
      "Seven chilies and a lemon hung at the threshold to turn away misfortune. Replace it with a fresh one when the week is up.",
    actionLabel: "Hang a fresh garland",
  },
  {
    id: "drishti-bommai",
    emoji: "👺",
    name: "Drishti bommai",
    ritual: "ward",
    region: "India",
    description:
      "A fierce painted face hung outside new homes to catch the evil eye before it crosses the threshold. Give it a stare and let it take the gaze for you.",
    actionLabel: "Stare it down",
  },
  {
    id: "panchang-jie",
    emoji: "🪢",
    name: "Pánchángjié",
    ritual: "chime",
    region: "China",
    description:
      "The endless mystic knot, tied without a beginning or an end, for luck that keeps circling back. Give the tassel a spin to keep it moving.",
    actionLabel: "Spin the tassel",
  },
];

export function ritualFor(charm: Charm): RitualType {
  return charm.ritual ?? "sparkle";
}
