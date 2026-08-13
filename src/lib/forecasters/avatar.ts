const avatarByName: Record<string, string> = {
  "Elon Musk": "elon_musk.jpg",
  "J.P. Morgan": "jp_morgan.jpg",
  "Michael Burry": "michael_burry.jpg",
  "Niccolo Machiavelli": "niccolo_machiavelli.jpg",
  "Ray Dalio": "ray_dalio.jpg",
  "Sherlock Holmes": "sherlock_holmes.jpg",
  Superintelligence: "superintelligence.jpg",
  "Warren Buffett": "warren_buffett.jpg",
};

export function getForecasterAvatar(sourceName: string): string {
  return `/assets/forecasters/${avatarByName[sourceName] ?? "consensus.jpg"}`;
}
