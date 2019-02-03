import Discord from "discord.js";

export const smash = (message, content) => message.channel.send(new Discord.RichEmbed({
	description: `${message.author} smashed${content && " "}${content}!`,
	image: { url: "https://raw.githubusercontent.com/jdh8/natsuki/master/assets/smash.png" },
}));
