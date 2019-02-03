import Discord from "discord.js";

export const lick = (message, content) => message.channel.send(new Discord.RichEmbed({
	description: `${message.author} licked ${content || "the air"}!`,
	image: { url: "https://cdn.discordapp.com/attachments/421196261132075009/421920949277818891/LickTemplate.gif" },
}));

export const licc = lick;
