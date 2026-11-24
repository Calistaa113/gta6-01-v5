# VISTAMAR v3: Golden Hour

[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?ref=77s3ms7w)
[![rank](https://make.fun/badge/gta6-01/Calistaa113/gta6-01-v5/rank.svg)](https://make.fun/bounty/gta6-01?ref=77s3ms7w)
[![reward](https://make.fun/badge/gta6-01/Calistaa113/gta6-01-v5/reward.svg)](https://make.fun/bounty/gta6-01?ref=77s3ms7w)

An original open-world crime game set in **Vistamar**, a sunset coast city of art-deco hotels,
glass towers, palm-lined Ocean Drive and a glittering sea. Built for the make.fun bounty
[Make GTA 6](https://make.fun/bounty/gta6-01) by Calistaa113 — repo
[Calistaa113/gta6-01-v5](https://github.com/Calistaa113/gta6-01-v5). Referral code: `77s3ms7w`.

Everything runs in the browser from static files (Three.js vendored, no network loads, no build step).

## What is in the city

- **Full 3D golden hour**: shader sky with a setting sun and drifting clouds, ACES tone mapping,
  soft sun shadows, haze, and an animated ocean with sun glint.
- **Curvy cars**: bezier-profile bodies extruded with deep bevels, tinted glass cabins, 6-spoke
  chrome rims, mirrors, grilles, glowing head and tail lights, clearcoat paint that reflects the sky.
  Ardent GT sports car, Marlowe 4 sedan, Pelican van and the VPD cruiser with a flashing lightbar.
- **Buildings with depth**: recessed windows with sills, floor bands, pilasters, cornices,
  balconies with railings, storefront glass, awnings, neon hotel signs and deco fins,
  glass towers with mullion fins, rooftop AC units and water tanks.
- **3D palms**: curved tapering trunks, folded drooping fronds and coconuts, swaying in the breeze.
- **Life**: traffic on Ocean Drive and the inland boulevard, pedestrians on the promenade.

## Gameplay

- Walk, sprint, steal any car (**F**) and drive.
- Four weapons: fists, pistol, SMG, shotgun.
- **Wanted level 1-5**: police cruisers chase you, roadblocks seal the Neon Strip,
  and at four stars the **Skyhawk** helicopter hunts you with a spotlight. Break line of sight to cool down.
- **Six story missions** with dialogue: Golden Arrival, The Ledger, Port Varela Heat, Neon Run,
  Skyhawk and Last Sunset. Cash rewards, saved to localStorage.
- WebAudio radio stations (switch with **R**), gun and siren sounds.
- HUD: rotating minimap with police and target blips, wanted stars, money, weapon, health, speedometer.

## Controls

| Key | Action |
| --- | --- |
| W / S | Walk or accelerate / brake and reverse |
| A / D | Turn / steer |
| Mouse | Aim (click canvas to lock the pointer) |
| Click | Shoot |
| 1 - 4 | Pick weapon |
| Shift | Sprint / nitro |
| F | Enter, exit or steal a car |
| R | Next radio station |
| Enter | Start |

## Run it

```
node serve.ts      # or any static server in game/
```

Open `index.html` in `game/`. Screenshots are rendered from the game itself with `?shot=cover`,
`?shot=shootout`, `?shot=roadblock` and `?shot=title`.

## License

MIT — see [LICENSE](LICENSE).
