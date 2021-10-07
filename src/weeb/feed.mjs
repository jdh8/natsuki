import fetch from "node-fetch";

export const feed = async (action, content) =>
{
	action.channel.sendTyping();

	return await action.reply({ embeds: [{
		description: `${action.member || action.author} fed ${content || "a random anime character"}!`,
		image: await (await fetch("https://nekos.life/api/v2/img/feed")).json(),
	}]});
};
