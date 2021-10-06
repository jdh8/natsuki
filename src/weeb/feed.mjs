import fetch from "node-fetch";

export const feed = async (message, content) =>
{
	message.channel.sendTyping();

	return await message.reply({ embeds: [{
		description: `${message.author} fed ${content || "a random anime character"}!`,
		image: await (await fetch("https://nekos.life/api/v2/img/feed")).json(),
	}]});
};
