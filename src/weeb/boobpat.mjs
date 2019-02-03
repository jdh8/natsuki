import typing from "../../lib/typing.mjs";
import Discord from "discord.js";

export const boobpat = typing(async (message, content) => await message.channel.send(new Discord.RichEmbed({
	description: `${message.author} patted ${content ? `${content} on the` : "some"} boobs!`,
	image: { url: "https://cdn.discordapp.com/attachments/403299886352695297/472762872209080321/image.gif" },
})));
