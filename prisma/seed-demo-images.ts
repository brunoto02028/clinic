/**
 * Generates placeholder foot scan images (SVG-based) for the demo scan
 * and updates the FootScan record with image URLs.
 *
 * Usage: npx tsx prisma/seed-demo-images.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ─── Shared SVG definitions for realistic skin rendering ───
function sharedDefs(id: string): string {
  return `
    <linearGradient id="skin-${id}" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#f0c4a8"/>
      <stop offset="40%" stop-color="#e8b494"/>
      <stop offset="100%" stop-color="#d4956b"/>
    </linearGradient>
    <linearGradient id="skin-shadow-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c6835a"/>
      <stop offset="100%" stop-color="#b37348"/>
    </linearGradient>
    <linearGradient id="nail-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f5e6d8"/>
      <stop offset="50%" stop-color="#eed5c2"/>
      <stop offset="100%" stop-color="#e0c0a8"/>
    </linearGradient>
    <radialGradient id="callus-${id}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#dba878"/>
      <stop offset="100%" stop-color="#d4956b" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow-${id}" x="-5%" y="-5%" width="115%" height="115%">
      <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#5a3e2b" flood-opacity="0.25"/>
    </filter>
    <filter id="inner-${id}" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
      <feOffset dx="1" dy="1"/>
      <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feFlood flood-color="#8b6042" flood-opacity="0.2"/>
      <feComposite in2="SourceGraphic" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="floor-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f1ede9"/>
      <stop offset="100%" stop-color="#e8e0d8"/>
    </linearGradient>
    <linearGradient id="sole-rubber-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3d3d3d"/>
      <stop offset="50%" stop-color="#2a2a2a"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>`;
}

// ─── Plantar view (bottom of foot on A4 paper) ───
function svgPlantar(side: string, id: string): string {
  const isLeft = side === "left";
  const m = isLeft ? 1 : -1; // mirror factor
  // All paths drawn for left foot, then we mirror for right
  const tx = isLeft ? 0 : 400;
  const sc = isLeft ? 1 : -1;
  return `
    <!-- A4 Paper -->
    <rect x="60" y="50" width="280" height="380" rx="3" fill="white" stroke="#c8c8c8" stroke-width="0.8"/>
    <text x="200" y="42" font-size="9" fill="#a0a0a0" text-anchor="middle" font-family="Arial">A4 Reference Paper (210×297mm)</text>
    <!-- Foot outline with realistic skin -->
    <g transform="translate(${tx},0) scale(${sc},1)" filter="url(#shadow-${id})">
      <!-- Main foot shape -->
      <path d="M195 90 C218 85 240 100 248 130 C254 155 256 185 255 220 C254 258 250 290 242 320 C238 338 228 358 215 370 C205 378 192 383 180 382 C165 380 153 370 145 355 C135 335 130 305 132 270 C134 240 130 210 133 175 C136 148 145 120 160 102 C170 92 182 88 195 90Z" fill="url(#skin-${id})"/>
      <!-- Plantar surface (slightly darker center) -->
      <path d="M192 105 C210 102 228 115 234 140 C238 160 240 190 240 220 C239 255 236 285 230 310 C226 328 218 345 208 355 C200 362 190 366 180 365 C170 363 161 355 155 342 C147 325 143 300 145 270 C147 242 143 215 146 185 C149 158 157 132 168 115 C176 105 184 100 192 105Z" fill="url(#skin-shadow-${id})" opacity="0.3"/>
      <!-- Arch area (lighter = less contact) -->
      <ellipse cx="155" cy="230" rx="18" ry="50" fill="#f0c4a8" opacity="0.5"/>
      <!-- Heel pad -->
      <ellipse cx="193" cy="340" rx="28" ry="22" fill="#d4956b" opacity="0.4"/>
      <!-- Ball of foot callus -->
      <ellipse cx="210" cy="140" rx="25" ry="15" fill="url(#callus-${id})" opacity="0.6"/>
      <!-- Toe pads -->
      <ellipse cx="195" cy="98" rx="12" ry="9" fill="#d4956b" opacity="0.35"/>
      <ellipse cx="215" cy="102" rx="8" ry="7" fill="#d4956b" opacity="0.3"/>
      <ellipse cx="225" cy="110" rx="7" ry="6" fill="#d4956b" opacity="0.25"/>
      <ellipse cx="232" cy="120" rx="6" ry="5.5" fill="#d4956b" opacity="0.2"/>
      <ellipse cx="237" cy="132" rx="5.5" ry="5" fill="#d4956b" opacity="0.2"/>
      <!-- Toe separation lines -->
      <path d="M205 95 L210 105" stroke="#c6835a" stroke-width="0.6" opacity="0.5"/>
      <path d="M220 100 L222 112" stroke="#c6835a" stroke-width="0.5" opacity="0.4"/>
      <path d="M228 108 L230 118" stroke="#c6835a" stroke-width="0.5" opacity="0.4"/>
      <path d="M234 118 L236 127" stroke="#c6835a" stroke-width="0.4" opacity="0.35"/>
      <!-- Creases -->
      <path d="M170 155 Q195 150 230 160" stroke="#c08060" stroke-width="0.5" fill="none" opacity="0.4"/>
      <path d="M165 170 Q190 165 235 172" stroke="#c08060" stroke-width="0.4" fill="none" opacity="0.3"/>
    </g>
    <!-- Pressure heatmap overlay -->
    <g opacity="0.25">
      <ellipse cx="${isLeft ? 193 : 207}" cy="340" rx="26" ry="20" fill="#ef4444"/>
      <ellipse cx="${isLeft ? 210 : 190}" cy="140" rx="22" ry="14" fill="#f97316"/>
      <ellipse cx="${isLeft ? 195 : 205}" cy="98" rx="14" ry="10" fill="#eab308"/>
    </g>
    <!-- Clinical annotations -->
    <line x1="${isLeft ? 280 : 120}" y1="230" x2="${isLeft ? 310 : 90}" y2="230" stroke="#2563eb" stroke-width="0.7" stroke-dasharray="2,2"/>
    <text x="${isLeft ? 315 : 85}" y="234" font-size="8" fill="#2563eb" text-anchor="${isLeft ? 'start' : 'end'}" font-family="Arial">Medial arch (flat)</text>
    <line x1="${isLeft ? 240 : 160}" y1="340" x2="${isLeft ? 310 : 90}" y2="355" stroke="#dc2626" stroke-width="0.7" stroke-dasharray="2,2"/>
    <text x="${isLeft ? 315 : 85}" y="359" font-size="8" fill="#dc2626" text-anchor="${isLeft ? 'start' : 'end'}" font-family="Arial">Heel — high pressure</text>`;
}

// ─── Medial view (inner side, arch visible) ───
function svgMedial(side: string, id: string): string {
  const isLeft = side === "left";
  return `
    <!-- Floor line -->
    <rect x="20" y="340" width="360" height="50" fill="url(#floor-${id})" rx="2"/>
    <line x1="20" y1="340" x2="380" y2="340" stroke="#c8c0b8" stroke-width="0.5"/>
    <!-- Foot silhouette — medial view -->
    <g filter="url(#shadow-${id})">
      <!-- Ankle + leg -->
      <path d="M175 90 C180 85 195 82 205 85 C215 88 220 100 222 120 L225 155" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.8"/>
      <!-- Main foot body -->
      <path d="M225 155 C230 175 235 200 235 220 C235 245 228 280 215 305 C205 325 190 338 170 340 L65 340 C60 340 58 335 60 330 L70 320 C85 310 105 305 130 300 C145 295 155 285 160 270 C165 252 162 232 155 215 C148 200 142 185 140 170 C138 158 140 148 145 140 C150 130 160 122 170 118 C178 115 185 120 188 130" fill="url(#skin-${id})" stroke="#b37348" stroke-width="1"/>
      <!-- Arch area highlight (low arch = nearly touching ground) -->
      <path d="M70 340 C90 335 110 328 130 318 C140 312 148 300 152 285" fill="none" stroke="#c6835a" stroke-width="1.2" opacity="0.6"/>
      <!-- Ankle bone (medial malleolus) -->
      <ellipse cx="190" cy="145" rx="12" ry="15" fill="#e8b494" stroke="#c6835a" stroke-width="0.6"/>
      <!-- Navicular prominence -->
      <ellipse cx="155" cy="270" rx="8" ry="6" fill="#dba878" opacity="0.5"/>
      <!-- Toe detail -->
      <path d="M65 340 C63 332 62 325 65 320 L72 315" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.6"/>
      <!-- Toenail -->
      <ellipse cx="63" cy="328" rx="5" ry="4" fill="url(#nail-${id})" stroke="#c6835a" stroke-width="0.3"/>
      <!-- Achilles tendon -->
      <path d="M210 90 C215 110 220 135 225 160" fill="none" stroke="#c08060" stroke-width="1.5" opacity="0.5"/>
    </g>
    <!-- Arch height measurement -->
    <line x1="130" y1="302" x2="130" y2="340" stroke="#2563eb" stroke-width="0.8" stroke-dasharray="2,2"/>
    <line x1="125" y1="302" x2="135" y2="302" stroke="#2563eb" stroke-width="0.8"/>
    <line x1="125" y1="340" x2="135" y2="340" stroke="#2563eb" stroke-width="0.8"/>
    <text x="118" y="325" font-size="8" fill="#2563eb" text-anchor="end" font-family="Arial" transform="rotate(-90,118,325)">22mm</text>
    <!-- Clinical note -->
    <rect x="240" y="280" width="130" height="35" rx="4" fill="#fef2f2" stroke="#fca5a5" stroke-width="0.6"/>
    <text x="305" y="295" font-size="8" fill="#dc2626" text-anchor="middle" font-family="Arial" font-weight="bold">Pes Planus</text>
    <text x="305" y="307" font-size="7" fill="#ef4444" text-anchor="middle" font-family="Arial">Reduced medial arch</text>`;
}

// ─── Lateral view (outer side) ───
function svgLateral(side: string, id: string): string {
  return `
    <!-- Floor -->
    <rect x="20" y="340" width="360" height="50" fill="url(#floor-${id})" rx="2"/>
    <line x1="20" y1="340" x2="380" y2="340" stroke="#c8c0b8" stroke-width="0.5"/>
    <!-- Foot — lateral view -->
    <g filter="url(#shadow-${id})">
      <!-- Leg + ankle -->
      <path d="M195 90 C190 85 178 82 170 85 C162 90 158 105 156 125 L152 155" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.8"/>
      <!-- Main body -->
      <path d="M152 155 C148 175 142 200 140 225 C138 255 142 285 155 310 C165 328 182 338 205 340 L330 340 C335 340 337 336 335 332 L325 322 C310 312 290 306 268 302 C252 298 240 290 232 275 C225 260 222 240 225 218 C228 198 235 180 242 165 C248 152 250 142 248 132 C245 120 238 112 228 108 C218 105 208 108 202 118" fill="url(#skin-${id})" stroke="#b37348" stroke-width="1"/>
      <!-- Lateral malleolus -->
      <ellipse cx="175" cy="148" rx="11" ry="14" fill="#e8b494" stroke="#c6835a" stroke-width="0.6"/>
      <!-- 5th metatarsal base prominence -->
      <ellipse cx="248" cy="280" rx="7" ry="5" fill="#dba878" opacity="0.5"/>
      <!-- Small toe -->
      <path d="M330 340 C332 334 333 328 330 324 L324 318" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.6"/>
      <ellipse cx="332" cy="330" rx="4" ry="3" fill="url(#nail-${id})" stroke="#c6835a" stroke-width="0.3"/>
      <!-- Achilles tendon -->
      <path d="M168 90 C163 110 158 138 155 160" fill="none" stroke="#c08060" stroke-width="1.5" opacity="0.5"/>
      <!-- Peroneal tendons -->
      <path d="M178 155 C195 180 218 210 240 245" fill="none" stroke="#c08060" stroke-width="0.6" opacity="0.3"/>
    </g>
    <!-- 5th MT annotation -->
    <line x1="255" y1="280" x2="310" y2="265" stroke="#2563eb" stroke-width="0.6" stroke-dasharray="2,2"/>
    <text x="315" y="269" font-size="7" fill="#2563eb" text-anchor="start" font-family="Arial">5th MT base</text>`;
}

// ─── Posterior view (back of heel/ankle) ───
function svgPosterior(side: string, id: string): string {
  const isLeft = side === "left";
  // Calcaneal valgus: heel tilts medially (inward) for overpronation
  const tiltAngle = isLeft ? -6.5 : 6.5; // degrees
  return `
    <!-- Floor -->
    <rect x="20" y="370" width="360" height="40" fill="url(#floor-${id})" rx="2"/>
    <line x1="20" y1="370" x2="380" y2="370" stroke="#c8c0b8" stroke-width="0.5"/>
    <!-- Leg (calf) -->
    <g filter="url(#shadow-${id})">
      <path d="M170 50 C165 48 158 50 155 55 L145 80 C138 105 135 135 136 165 L140 190" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.8"/>
      <path d="M230 50 C235 48 242 50 245 55 L255 80 C262 105 265 135 264 165 L260 190" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.8"/>
      <!-- Calf muscle bulk -->
      <path d="M140 80 C130 100 128 130 132 160 L140 190 L260 190 L268 160 C272 130 270 100 260 80" fill="url(#skin-${id})" stroke="#b37348" stroke-width="1"/>
      <!-- Calf midline -->
      <path d="M200 55 L200 190" stroke="#c08060" stroke-width="0.5" opacity="0.3"/>
    </g>
    <!-- Heel with calcaneal tilt -->
    <g transform="rotate(${tiltAngle},200,370)" filter="url(#shadow-${id})">
      <!-- Achilles tendon -->
      <path d="M185 190 C188 210 192 240 195 270 L205 270 C208 240 212 210 215 190" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.8"/>
      <!-- Heel body -->
      <path d="M160 280 C155 300 152 325 155 350 C158 362 168 370 185 372 L215 372 C232 370 242 362 245 350 C248 325 245 300 240 280 L160 280Z" fill="url(#skin-${id})" stroke="#b37348" stroke-width="1"/>
      <!-- Achilles insertion -->
      <ellipse cx="200" cy="275" rx="18" ry="8" fill="#dba878" opacity="0.4"/>
      <!-- Heel pad wrinkles -->
      <path d="M170 355 Q200 350 230 355" stroke="#c08060" stroke-width="0.4" fill="none" opacity="0.4"/>
      <path d="M175 362 Q200 358 225 362" stroke="#c08060" stroke-width="0.3" fill="none" opacity="0.3"/>
    </g>
    <!-- Plumb line -->
    <line x1="200" y1="40" x2="200" y2="395" stroke="#7c3aed" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.6"/>
    <text x="200" y="35" font-size="7" fill="#7c3aed" text-anchor="middle" font-family="Arial">Plumb line</text>
    <!-- Calcaneal angle annotation -->
    <line x1="200" y1="370" x2="${isLeft ? 185 : 215}" y2="280" stroke="#dc2626" stroke-width="1" stroke-dasharray="2,2"/>
    <path d="M200 350 A20 20 0 0 ${isLeft ? '0' : '1'} ${isLeft ? '195' : '205'} 332" fill="none" stroke="#dc2626" stroke-width="1"/>
    <text x="${isLeft ? 160 : 240}" y="330" font-size="9" fill="#dc2626" text-anchor="middle" font-family="Arial" font-weight="bold">6.5° valgus</text>
    <!-- Clinical note -->
    <rect x="${isLeft ? 30 : 260}" y="290" width="100" height="30" rx="4" fill="#fef2f2" stroke="#fca5a5" stroke-width="0.5"/>
    <text x="${isLeft ? 80 : 310}" y="303" font-size="7" fill="#dc2626" text-anchor="middle" font-family="Arial" font-weight="bold">Calcaneal Valgus</text>
    <text x="${isLeft ? 80 : 310}" y="314" font-size="7" fill="#ef4444" text-anchor="middle" font-family="Arial">Overpronation pattern</text>`;
}

// ─── Anterior/Dorsal view (top of foot, toes facing viewer) ───
function svgAnterior(side: string, id: string): string {
  const isLeft = side === "left";
  // Hallux valgus deviation for left foot
  const hvOffset = isLeft ? 15 : 0; // lateral deviation in pixels
  return `
    <!-- Floor -->
    <rect x="20" y="380" width="360" height="30" fill="url(#floor-${id})" rx="2"/>
    <line x1="20" y1="380" x2="380" y2="380" stroke="#c8c0b8" stroke-width="0.5"/>
    <g filter="url(#shadow-${id})">
      <!-- Dorsal foot surface -->
      <path d="M${isLeft ? '150' : '250'} 380 C${isLeft ? '145' : '255'} 350 ${isLeft ? '140' : '260'} 310 ${isLeft ? '138' : '262'} 270 C${isLeft ? '136' : '264'} 235 ${isLeft ? '140' : '260'} 200 ${isLeft ? '148' : '252'} 170 C${isLeft ? '155' : '245'} 145 ${isLeft ? '168' : '232'} 130 ${isLeft ? '185' : '215'} 122 L${isLeft ? '215' : '185'} 122 C${isLeft ? '232' : '168'} 130 ${isLeft ? '245' : '155'} 145 ${isLeft ? '252' : '148'} 170 C${isLeft ? '260' : '140'} 200 ${isLeft ? '264' : '136'} 235 ${isLeft ? '262' : '138'} 270 C${isLeft ? '260' : '140'} 310 ${isLeft ? '255' : '145'} 350 ${isLeft ? '250' : '150'} 380Z" fill="url(#skin-${id})" stroke="#b37348" stroke-width="1"/>
      <!-- Extensor tendons -->
      <path d="M${isLeft ? '175' : '225'} 180 L${isLeft ? '170' : '230'} 130" stroke="#c6835a" stroke-width="0.6" opacity="0.3"/>
      <path d="M${isLeft ? '195' : '205'} 175 L${isLeft ? '195' : '205'} 125" stroke="#c6835a" stroke-width="0.6" opacity="0.3"/>
      <path d="M${isLeft ? '215' : '185'} 180 L${isLeft ? '218' : '182'} 128" stroke="#c6835a" stroke-width="0.6" opacity="0.3"/>
      <path d="M${isLeft ? '230' : '170'} 190 L${isLeft ? '235' : '165'} 135" stroke="#c6835a" stroke-width="0.5" opacity="0.25"/>
      <!-- Veins -->
      <path d="M${isLeft ? '180' : '220'} 300 C${isLeft ? '175' : '225'} 270 ${isLeft ? '185' : '215'} 240 ${isLeft ? '178' : '222'} 210" stroke="#7da7c2" stroke-width="0.6" fill="none" opacity="0.3"/>
    </g>
    <!-- Toes (individual) -->
    <!-- Big toe (hallux) — with valgus deviation -->
    <g filter="url(#inner-${id})">
      <ellipse cx="${isLeft ? 165 - hvOffset : 235 + hvOffset}" cy="110" rx="14" ry="18" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.8" transform="rotate(${isLeft ? hvOffset : -hvOffset},${isLeft ? 165 - hvOffset : 235 + hvOffset},110)"/>
      <ellipse cx="${isLeft ? 165 - hvOffset : 235 + hvOffset}" cy="100" rx="9" ry="10" fill="url(#nail-${id})" stroke="#c6835a" stroke-width="0.4"/>
      <!-- 2nd toe -->
      <ellipse cx="${isLeft ? 185 : 215}" cy="105" rx="9" ry="14" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.7"/>
      <ellipse cx="${isLeft ? 185 : 215}" cy="97" rx="6" ry="7" fill="url(#nail-${id})" stroke="#c6835a" stroke-width="0.3"/>
      <!-- 3rd toe -->
      <ellipse cx="${isLeft ? 202 : 198}" cy="108" rx="8" ry="13" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.7"/>
      <ellipse cx="${isLeft ? 202 : 198}" cy="101" rx="5.5" ry="6.5" fill="url(#nail-${id})" stroke="#c6835a" stroke-width="0.3"/>
      <!-- 4th toe -->
      <ellipse cx="${isLeft ? 217 : 183}" cy="113" rx="7.5" ry="12" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.6"/>
      <ellipse cx="${isLeft ? 217 : 183}" cy="106" rx="5" ry="6" fill="url(#nail-${id})" stroke="#c6835a" stroke-width="0.3"/>
      <!-- 5th toe (pinky) -->
      <ellipse cx="${isLeft ? 230 : 170}" cy="120" rx="6.5" ry="10" fill="url(#skin-${id})" stroke="#b37348" stroke-width="0.6"/>
      <ellipse cx="${isLeft ? 230 : 170}" cy="114" rx="4.5" ry="5" fill="url(#nail-${id})" stroke="#c6835a" stroke-width="0.3"/>
    </g>
    ${isLeft ? `
    <!-- Hallux valgus annotation -->
    <line x1="150" y1="110" x2="120" y2="85" stroke="#dc2626" stroke-width="0.8" stroke-dasharray="2,2"/>
    <text x="115" y="80" font-size="8" fill="#dc2626" text-anchor="end" font-family="Arial" font-weight="bold">18° HV</text>
    <!-- Bunion bump -->
    <ellipse cx="${165 - hvOffset + 12}" cy="120" rx="5" ry="4" fill="#e8a090" opacity="0.6" stroke="#d08070" stroke-width="0.4"/>
    <line x1="${165 - hvOffset + 15}" y1="120" x2="${165 - hvOffset + 35}" y2="130" stroke="#dc2626" stroke-width="0.5" stroke-dasharray="2,1"/>
    <text x="${165 - hvOffset + 38}" y="134" font-size="7" fill="#dc2626" font-family="Arial">Bunion</text>
    ` : ''}`;
}

// ─── Shoe sole view (wear pattern analysis) ───
function svgShoeSole(side: string, id: string): string {
  const isLeft = side === "left";
  return `
    <!-- Background texture (floor) -->
    <rect x="20" y="30" width="360" height="420" fill="#f5f0eb" rx="4"/>
    <!-- Shoe sole outline -->
    <g filter="url(#shadow-${id})">
      <path d="M${isLeft ? '200' : '200'} 55 C${isLeft ? '235' : '165'} 50 ${isLeft ? '265' : '135'} 65 ${isLeft ? '275' : '125'} 95 C${isLeft ? '282' : '118'} 120 ${isLeft ? '280' : '120'} 155 ${isLeft ? '275' : '125'} 190 C${isLeft ? '270' : '130'} 220 ${isLeft ? '262' : '138'} 250 ${isLeft ? '258' : '142'} 280 C${isLeft ? '255' : '145'} 310 ${isLeft ? '258' : '142'} 340 ${isLeft ? '252' : '148'} 365 C${isLeft ? '245' : '155'} 388 ${isLeft ? '228' : '172'} 400 ${isLeft ? '200' : '200'} 402 C${isLeft ? '172' : '228'} 400 ${isLeft ? '155' : '245'} 388 ${isLeft ? '148' : '252'} 365 C${isLeft ? '142' : '258'} 340 ${isLeft ? '145' : '255'} 310 ${isLeft ? '142' : '258'} 280 C${isLeft ? '138' : '262'} 250 ${isLeft ? '130' : '270'} 220 ${isLeft ? '125' : '275'} 190 C${isLeft ? '120' : '280'} 155 ${isLeft ? '118' : '282'} 120 ${isLeft ? '125' : '275'} 95 C${isLeft ? '135' : '265'} 65 ${isLeft ? '165' : '235'} 50 ${isLeft ? '200' : '200'} 55Z" fill="url(#sole-rubber-${id})" stroke="#111" stroke-width="1.5"/>
      <!-- Tread pattern lines -->
      ${Array.from({ length: 12 }, (_, i) => {
        const y = 70 + i * 28;
        return `<line x1="${isLeft ? 140 : 160}" y1="${y}" x2="${isLeft ? 260 : 240}" y2="${y}" stroke="#444" stroke-width="0.6" opacity="0.4"/>`;
      }).join('\n      ')}
      <!-- Forefoot flex groove -->
      <path d="M${isLeft ? '140' : '260'} 170 Q200 155 ${isLeft ? '260' : '140'} 170" fill="none" stroke="#555" stroke-width="1.2"/>
    </g>
    <!-- Wear zones (coloured overlays) -->
    <!-- Medial forefoot wear (overpronation indicator) -->
    <ellipse cx="${isLeft ? 175 : 225}" cy="110" rx="30" ry="22" fill="#ef4444" opacity="0.45"/>
    <text x="${isLeft ? 175 : 225}" y="114" font-size="7" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">Heavy wear</text>
    <!-- Medial heel wear -->
    <ellipse cx="${isLeft ? 210 : 190}" cy="370" rx="25" ry="18" fill="#f97316" opacity="0.4"/>
    <text x="${isLeft ? 210 : 190}" y="374" font-size="7" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">Mod. wear</text>
    <!-- Lateral midfoot (minimal wear = normal) -->
    <ellipse cx="${isLeft ? 245 : 155}" cy="230" rx="18" ry="30" fill="#22c55e" opacity="0.25"/>
    <!-- Legend -->
    <rect x="30" y="435" width="340" height="30" rx="4" fill="white" stroke="#e5e7eb" stroke-width="0.5"/>
    <circle cx="60" cy="450" r="5" fill="#ef4444" opacity="0.6"/>
    <text x="70" y="453" font-size="7" fill="#555" font-family="Arial">Heavy</text>
    <circle cx="120" cy="450" r="5" fill="#f97316" opacity="0.5"/>
    <text x="130" y="453" font-size="7" fill="#555" font-family="Arial">Moderate</text>
    <circle cx="190" cy="450" r="5" fill="#eab308" opacity="0.4"/>
    <text x="200" y="453" font-size="7" fill="#555" font-family="Arial">Mild</text>
    <circle cx="250" cy="450" r="5" fill="#22c55e" opacity="0.3"/>
    <text x="260" y="453" font-size="7" fill="#555" font-family="Arial">Minimal</text>
    <!-- Gait conclusion -->
    <rect x="60" y="60" width="120" height="20" rx="3" fill="#fef2f2" stroke="#fca5a5" stroke-width="0.5" opacity="0.9"/>
    <text x="120" y="74" font-size="7" fill="#dc2626" text-anchor="middle" font-family="Arial" font-weight="bold">Medial wear → Overpronation</text>`;
}

// ─── Master generator ───
function generateFootSVG(angle: string, side: string, width = 400, height = 500): string {
  const id = `${side}-${angle}`;
  const label = `${side.charAt(0).toUpperCase() + side.slice(1)} Foot — ${angle.charAt(0).toUpperCase() + angle.slice(1)} View`;

  const contentFn: Record<string, () => string> = {
    plantar: () => svgPlantar(side, id),
    medial: () => svgMedial(side, id),
    lateral: () => svgLateral(side, id),
    posterior: () => svgPosterior(side, id),
    anterior: () => svgAnterior(side, id),
    "shoe-sole": () => svgShoeSole(side, id),
  };

  const content = (contentFn[angle] || contentFn["plantar"])();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>${sharedDefs(id)}</defs>
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#f8f6f3" rx="6"/>
  <!-- Header -->
  <rect x="0" y="0" width="${width}" height="24" fill="#1e293b" rx="6"/>
  <rect x="0" y="12" width="${width}" height="12" fill="#1e293b"/>
  <text x="${width / 2}" y="16" font-size="10" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">${label}</text>
  ${content}
  <!-- Footer -->
  <rect x="0" y="${height - 18}" width="${width}" height="18" fill="#1e293b" rx="6"/>
  <rect x="0" y="${height - 18}" width="${width}" height="9" fill="#1e293b"/>
  <text x="${width / 2}" y="${height - 5}" font-size="7" fill="#94a3b8" text-anchor="middle" font-family="Arial">BPR Foot Scan System — Clinical Assessment Image</text>
</svg>`;
}

async function main() {
  console.log("🖼️  Generating demo foot scan images...\n");

  // Find the demo scan
  const scan = await prisma.footScan.findFirst({
    where: { scanNumber: "FS-DEMO-00001" },
  });

  if (!scan) {
    console.error("❌ Demo scan FS-DEMO-00001 not found. Run seed-demo-footscan.ts first.");
    process.exit(1);
  }

  // Create upload directory
  const uploadDir = path.join(process.cwd(), "public", "uploads", "foot-scans", scan.id);
  fs.mkdirSync(uploadDir, { recursive: true });

  const angles = ["plantar", "medial", "lateral", "posterior", "anterior", "shoe-sole"];
  const leftImages: string[] = [];
  const rightImages: string[] = [];

  for (const side of ["left", "right"]) {
    for (const angle of angles) {
      const svg = generateFootSVG(angle, side);
      const fileName = `${side}-${angle}.svg`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, svg);

      const imageUrl = `/uploads/foot-scans/${scan.id}/${fileName}`;
      if (side === "left") leftImages.push(imageUrl);
      else rightImages.push(imageUrl);

      console.log(`  ✅ ${side}/${angle} → ${fileName}`);
    }
  }

  // Update the scan with image URLs
  await prisma.footScan.update({
    where: { id: scan.id },
    data: {
      leftFootImages: leftImages,
      rightFootImages: rightImages,
    },
  });

  console.log(`\n  📸 ${leftImages.length + rightImages.length} images generated and linked to scan ${scan.scanNumber}`);
  console.log(`  📁 Directory: ${uploadDir}`);
  console.log(`\n  Now open Admin > Foot Scans > FS-DEMO-00001 > View Report to see the full report.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
