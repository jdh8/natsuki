import fetch from "node-fetch";

export const neko = async (message, content) =>
{
	const endpoint = message.channel.nsfw ? "https://nekos.life/api/v2/img/lewd" : "https://nekos.life/api/v2/img/neko";

	message.channel.sendTyping();

	return await message.reply({ embeds: [{
		description: "Here comes your random neko.",
		image: await (await fetch(endpoint)).json(),
	}]});
};
