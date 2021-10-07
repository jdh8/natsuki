import fetch from "node-fetch";

export const neko = async action =>
{
	const endpoint = action.channel.nsfw ? "https://nekos.life/api/v2/img/lewd" : "https://nekos.life/api/v2/img/neko";

	action.channel.sendTyping();

	return await action.reply({ embeds: [{
		description: "Here comes your random neko.",
		image: await (await fetch(endpoint)).json(),
	}]});
};
