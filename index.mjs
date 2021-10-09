import { ShardingManager } from "discord.js";
import { AutoPoster } from "topgg-autoposter";

const manager = new ShardingManager("./src/client.mjs", { mode: "worker", token: process.env.TOKEN });
const { TOP_GG_TOKEN } = process.env;

if (TOP_GG_TOKEN)
	AutoPoster(TOP_GG_TOKEN, manager);

manager.spawn();
