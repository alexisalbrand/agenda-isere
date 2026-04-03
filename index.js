import { main, scrapeOne } from "./src/main.js";

const theater = process.argv[2];
if (theater) scrapeOne(theater).catch(console.error);
else main().catch(console.error);
