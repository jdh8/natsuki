import typing from "../../lib/typing.mjs";
import Discord from "discord.js";

export const buttpat = typing(async (message, content) => await message.channel.send(new Discord.RichEmbed({
	description: `${message.author} patted ${content || "Yuzu"} on the butts!`,
	image: { url: "https://78.media.tumblr.com/165f23ece178a17968de50f084a9ecec/tumblr_p25cyprR041vptudso2_400.gif" },
})));
