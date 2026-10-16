# Dust Yard

First-person multiplayer free-for-all in the browser: AK-74U and combat knife, matchmaking, invite links, practice bots.

- **Hosting:** static site on Vercel (`index.html` + `models/`).
- **Multiplayer:** Supabase Realtime (broadcast + presence channels, no database tables).
- **3D:** Three.js r128 + GLTFLoader from CDN.

## Controls
WASD move · mouse aim · E get in/out of the rowing boat (W paddle, A/D steer, S back-paddle) · left click fire/slash · right click aim down sights · R reload · T inspect · 1 knife · 2 rifle · Q / wheel swap · V quick knife · Shift sprint · C crouch · Space jump · Tab scoreboard · Esc pause / invite link.

## Credits
- AK-74U first-person arms and animations: "AK74U | FREE ANIMATION" by BURNER (https://sketchfab.com/Alexander_Ovelar), CC BY 4.0. Textures recompressed and unused data removed for the web.
- Knife and fallback rifle models by Pichuliru (Sketchfab).
- F1 car: "Visa Cash App Red Bull Racing VCARB01" by bachlamanh406 (Sketchfab), CC BY 4.0. Simplified for the web.
- F1 track: "Shanghai International Circuit 2018 layout" by Dave Love (Sketchfab), CC BY 4.0. Simplified for the web.

## F1 race (`/race`)
W/↑ throttle · S/↓ brake/reverse · A D steer · C camera (cockpit / T-cam / chase) · R reset to track · Esc pause. Gamepad triggers + left stick work too.
- Boat: "Boat" by KamillaKraus (https://sketchfab.com/KamillaKraus), CC BY 4.0. Texture recompressed and mesh simplified for the web.
