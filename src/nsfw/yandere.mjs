import nsfw from "../lib/nsfw.mjs";
import query from "../lib/query.mjs";
import sample from "../lib/sample.mjs";
import score from "../lib/score.mjs";

import fetch from "node-fetch";

export const yandere = nsfw(async (message, content) =>
{
	message.channel.sendTyping();

	const array = await (await fetch(`https://yande.re/post.json?tags=${query(content)}`)).json();
	const result = array.length ? score(sample(array)) : `No image found for \`${content}\` on https://yande.re/`;

	return await message.reply(result);
});
