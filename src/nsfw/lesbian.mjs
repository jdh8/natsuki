import nsfw from "../lib/nsfw.mjs";
import fetch from "node-fetch";

export const lesbian = nsfw(async (action, content) =>
{
	action.channel.sendTyping();

	return await action.reply({ embeds: [{
		description: "👩‍❤️‍👩👩‍❤️‍💋‍👩",
		image: await (await fetch("https://nekos.life/api/v2/img/les")).json(),
	}]});
});

export const les = lesbian;
