import * as Message from "../lib/Message.mjs";
import * as Random from "../lib/Random.mjs";
import * as Dataset from "../data/index.mjs";

import Discord from "discord.js";
import snekfetch from "snekfetch";

import util from "util";

export const boobpat = Message.typing(async (message, content) => await message.channel.send(new Discord.RichEmbed({
	description: `${message.author} patted ${content ? `${content} on the` : "some"} boobs!`,
	image: { url: "https://cdn.discordapp.com/attachments/403299886352695297/472762872209080321/image.gif" },
})));

export const buttpat = Message.typing(async (message, content) => await message.channel.send(new Discord.RichEmbed({
	description: `${message.author} patted ${content || "Yuzu"} on the butts!`,
	image: { url: "https://78.media.tumblr.com/165f23ece178a17968de50f084a9ecec/tumblr_p25cyprR041vptudso2_400.gif" },
})));

export const feed = Message.typing(async (message, content) => await message.channel.send(new Discord.RichEmbed({
	description: `${message.author} fed ${content || "a random anime character"}!`,
	image: (await snekfetch.get("https://nekos.life/api/v2/img/feed")).body,
})));

export const hug = (message, content) => message.channel.send(new Discord.RichEmbed({
	description: `${message.author} hugged ${content || "Yuri"}!`,
	image: { url: Random.pick(Dataset.hugs) },
}));

export const kiss = (message, content) => message.channel.send(new Discord.RichEmbed({
	description: `${message.author} kissed ${content || "Natsuki"}!`,
	image: { url: Random.pick(Dataset.kisses) },
}));

export const lewd = message => message.channel.send("https://youtu.be/qr89xoZyE1g");

export const lick = (message, content) => message.channel.send(new Discord.RichEmbed({
	description: `${message.author} licked ${content || "the air"}!`,
	image: { url: "https://cdn.discordapp.com/attachments/421196261132075009/421920949277818891/LickTemplate.gif" },
}));

export const licc = lick;

export const neko = Message.typing(async (message, content) =>
{
	const endpoint = message.channel.nsfw ? "https://nekos.life/api/v2/img/lewd" : "https://nekos.life/api/v2/img/neko";

	return await message.channel.send(new Discord.RichEmbed({
		description: "Here comes your random neko.",
		image: (await snekfetch.get(endpoint)).body,
	}));
});

export const smash = (message, content) => message.channel.send(new Discord.RichEmbed({
	description: `${message.author} smashed${content && " "}${content}!`,
	image: { url: "https://raw.githubusercontent.com/jdh8/natsuki/master/assets/smash.png" },
}));
