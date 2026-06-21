// Registry of experiences.

import { createLightBulb } from "./lightbulb.js";
import { createCandle } from "./candle.js";
import { createBalloon } from "./balloon.js";
import { createFireworks } from "./fireworks.js";
import { createColorSplash } from "./colorsplash.js";
import { createFishing } from "./fishing.js";
import { createPiano } from "./piano.js";
import { createHarp } from "./harp.js";
import { createDrums } from "./drums.js";
import { createTheremin } from "./theremin.js";
import { createAirDraw } from "./airdraw.js";
import { createRunes } from "./runes.js";
import { createGrowFlowers } from "./growflowers.js";
import { createEnergyBall } from "./energyball.js";
import { createPhotoBooth } from "./photobooth.js";
import { createMakeFace } from "./makeface.js";
import { createFruitNinja } from "./fruitninja.js";
import { createFruitPick } from "./fruitpick.js";
import { createMosquito } from "./mosquito.js";
import { createMole } from "./mole.js";
import { createEggDrop } from "./eggdrop.js";
import { createDodge } from "./dodge.js";
import { createBow } from "./bow.js";
import { createSlingshot } from "./slingshot.js";
import { createStack } from "./stack.js";
import { createTicTacToe } from "./tictactoe.js";
import { createLightsaber } from "./lightsaber.js";
import { createMaze } from "./maze.js";
import { createGunShoot } from "./gunshoot.js";
import { createRPS } from "./rps.js";

export const EXPERIENCES = [
  { id: "ninja", name: "Fruit Ninja", tag: "swipe fast · 5 lives · bombs", icon: "🍉", status: "ready", create: createFruitNinja,
    info: "<b>Swipe</b> fast through the fruit to slice it. Clear 30 to win, avoid <b>bombs</b> and don't let 5 fall." },
  { id: "egg", name: "Egg Catch", tag: "catch eggs · dodge rotten", icon: "🥚", status: "ready", create: createEggDrop,
    info: "Slide the <b>basket</b> to catch eggs, but dodge the <b>green rotten ones</b> (−1). Miss 3 good eggs and it's over." },
  { id: "dodge", name: "Asteroid Dash", tag: "fly · dodge · pinch to blast", icon: "🚀", status: "ready", create: createDodge,
    info: "Move your hand to fly the <b>spaceship</b>, dodge the meteors, and <b>pinch to fire</b> and blast them. One hit ends it." },
  { id: "draw", name: "Air Draw", tag: "pinch to paint · glow strokes", icon: "✏️", status: "ready", create: createAirDraw,
    info: "<b>Pinch</b> to draw glowing strokes, open your hand to lift. Hover a <b>colour</b> to switch, hover <b>Clear</b> to wipe." },
  { id: "gun", name: "Tin Shooter", tag: "aim up/down · pinch to fire", icon: "🔫", status: "ready", create: createGunShoot,
    info: "The pistol stays on the left pointing straight across. Move your hand <b>up/down</b> to aim at the shelves of tins on the right, then <b>pinch</b> to fire." },
  { id: "rps", name: "Rock Paper Scissors", tag: "beat the computer", icon: "✊", status: "ready", create: createRPS,
    info: "On <b>Shoot!</b> show ✊ rock (fist), ✋ paper (open hand) or ✌️ scissors (two fingers) to beat the computer." },
  { id: "lightbulb", name: "Lights Out", tag: "pull to toggle · twist to remove", icon: "💡", status: "ready", create: createLightBulb,
    info: "Pinch the <b>chain</b> &amp; pull down to switch on/off (tick-tock!). Pinch the <b>bulb</b> and <b>twist</b> to unscrew it, it drops &amp; smashes. Open palm to fit a new one." },
  { id: "candle", name: "Candlelight", tag: "pucker to blow out", icon: "🕯️", status: "ready", create: createCandle,
    info: "<b>Pucker your lips</b> at the camera to blow the flame out. <b>Pinch twice</b> (lighter spark) to relight." },
  { id: "fireworks", name: "Fireworks", tag: "pinch to launch · burst", icon: "🎆", status: "ready", create: createFireworks,
    info: "<b>Pinch</b> anywhere to launch a firework, it whistles up and bursts into colour." },
  { id: "splash", name: "Splash Studio", tag: "stencil paint · beat the clock", icon: "🎨", status: "ready", create: createColorSplash,
    info: "Splash paint inside the <b>stencil</b>, move to streak, <b>pinch</b> for a big splash. When the timer ends the stencil lifts to reveal your art!" },
  { id: "piano", name: "Air Piano", tag: "dip a finger onto a key", icon: "🎹", status: "ready", create: createPiano,
    info: "Hover above the keys, then <b>dip a fingertip down</b> onto a key to play it. Several fingers / both hands = chords." },
  { id: "harp", name: "Air Harp", tag: "sweep across the strings", icon: "🎼", status: "ready", create: createHarp,
    info: "Sweep your <b>fingertips</b> across the strings to pluck them. Each string is a note." },
  { id: "drums", name: "Air Drums", tag: "stab the pads to play", icon: "🥁", status: "ready", create: createDrums,
    info: "Hit a drum/cymbal with a quick <b>downward stab</b> of your fingertip. Use both hands." },
  { id: "theremin", name: "Theremin", tag: "hands-free instrument", icon: "🎵", status: "ready", create: createTheremin,
    info: "<b>Right hand height</b> = pitch, <b>left hand height</b> = volume. Move slowly for smooth notes." },
  { id: "runes", name: "Magic Runes", tag: "draw a shape · cast a spell", icon: "🪄", status: "ready", create: createRunes,
    info: "<b>Pinch</b> and draw a shape, then release: ○ circle = shield · △ triangle = fireball · ⚡ zigzag = lightning ·, line = slash." },
  { id: "flowers", name: "Bloom Garden", tag: "right grows · left blooms", icon: "🌸", status: "ready", create: createGrowFlowers,
    info: "<b>Right hand</b>: pinch then open to grow the flower taller. <b>Left hand</b>: pinch then open to bloom it. Fills a tidy row." },
  { id: "energy", name: "Energy Ball", tag: "charge & thrust to blast", icon: "🔵", status: "ready", create: createEnergyBall,
    info: "Hold <b>both hands</b> up to charge a crackling orb, then <b>thrust</b> both hands to launch a blast." },
  { id: "saber", name: "Lightsaber", tag: "ignite · swing · slice droids", icon: "⚔️", status: "ready", create: createLightsaber,
    info: "Show your <b>right hand</b> to ignite the blade and <b>swing</b> to slice the droids. <b>Pinch your LEFT hand</b> to cycle colour: blue → red → green." },
  { id: "booth", name: "Photo Booth", tag: "face props · pinch to swap", icon: "😎", status: "ready", create: createPhotoBooth,
    info: "Your camera shows with <b>face-tracked props</b> (glasses, hats, octopus…). <b>Pinch</b> to change, <b>smile</b> for sparkles." },
  { id: "makeface", name: "Copycat Faces", tag: "copy the expression", icon: "🤪", status: "ready", create: createMakeFace,
    info: "Copy the <b>expression</b> shown (smile, surprise, tongue out, puff cheeks, wink…). Match it to score." },
  { id: "pick", name: "Orchard Rush", tag: "fill the basket · 60s", icon: "🧺", status: "ready", create: createFruitPick,
    info: "<b>Pinch</b> a fruit on the tree, <b>drag</b> it to the basket and release. Pick all 12 before the 60-second timer ends." },
  { id: "fishing", name: "Gone Fishing", tag: "drop hook · circle palm to reel", icon: "🎣", status: "ready", create: createFishing,
    info: "Move your hand to aim the hook (it slowly sinks). When a fish bites, <b>circle your palm</b> to wind the reel and pull it to the top." },
  { id: "mosquito", name: "Mosquito Smash", tag: "fist-swat · 45s", icon: "🪰", status: "ready", create: createMosquito,
    info: "A fly-swatter follows your hand, <b>close your fist</b> over a mosquito to swat it. Get as many as you can in 45 seconds." },
  { id: "mole", name: "Whack-a-Mole", tag: "pinch to bonk", icon: "🔨", status: "ready", create: createMole,
    info: "<b>Pinch</b> over a popped-up mole to bonk it. Score as many as you can in 45 seconds." },
  { id: "bow", name: "Archery", tag: "pinch · pull · release", icon: "🏹", status: "ready", create: createBow,
    info: "<b>Pinch</b> to draw the string, pull back (a dotted line shows the shot) and <b>release</b> to fire at the targets." },
  { id: "slingshot", name: "Balloon Buster", tag: "pull back · pop balloons", icon: "🪀", status: "ready", create: createSlingshot,
    info: "<b>Pinch</b> the pouch, pull back (aim line shown) and <b>release</b> to fling a stone and <b>pop the balloons</b>." },
  { id: "stack", name: "Tower Stack", tag: "pinch to drop · build up", icon: "🧱", status: "ready", create: createStack,
    info: "A block swings up top, <b>pinch</b> to drop it square onto the tower. Reach the FINISH line to win." },
  { id: "maze", name: "Marble Maze", tag: "tilt to roll · 2 mazes", icon: "🌀", status: "ready", create: createMaze,
    info: "<b>Tilt your hand</b> to rotate the maze; gravity gently rolls the ball through the gaps. Two mazes, a serpentine, then a circular ring-maze (start in the centre, roll out)." },
  { id: "ttt", name: "Tic-Tac-Toe", tag: "2 players · pinch to place", icon: "⭕", status: "ready", create: createTicTacToe,
    info: "Two players take turns: hover a square and <b>pinch</b> to place your mark. Open palm to reset." },
  { id: "balloon", name: "Balloon Pump", tag: "pucker to pump · pinch to tie", icon: "🎈", status: "ready", create: createBalloon,
    info: "<b>Pucker</b> to blow it up (it leaks when you stop). <b>Pinch</b> to tie it off in the green sweet-spot for a bonus, don't pop it!" }
];
