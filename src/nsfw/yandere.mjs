import nsfw from "../lib/nsfw.mjs";
import query from "../lib/query.mjs";
import sample from "../lib/sample.mjs";
import score from "../lib/score.mjs";

import fetch from "node-fetch";

export const yandere = nsfw(async (action, option) =>
{
	action.channel.sendTyping();

	const search = option?.value ?? option;
	const array = await (await fetch(`https://yande.re/post.json?tags=${ query(search) }`)).json();
	const result = array.length ? score(sample(array)) : `No image found for \`${ search }\` on https://yande.re/`;

	return action.reply(result);
});
