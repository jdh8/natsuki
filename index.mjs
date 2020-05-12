import Discord from "discord.js";

const manager = new Discord.ShardingManager("./src/client.mjs", { mode: "worker", token: process.env.TOKEN });

manager.spawn();
manager.on("launch", shard => console.log(`Launched shard ${shard.id}`));
