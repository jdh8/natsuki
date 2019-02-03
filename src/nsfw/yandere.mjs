import nsfw from "../../lib/nsfw.mjs";
import pick from "../../lib/pick.mjs";
import query from "../../lib/query.mjs";
import score from "../../lib/score.mjs";
import typing from "../../lib/typing.mjs";

import snekfetch from "snekfetch";

export const yandere = nsfw(typing(async (message, content) =>
{
	const { body } = await snekfetch.get(`https://yande.re/post.json?tags=${query(content)}`);
	return await message.channel.send(body.length ? score(pick(body)) : `No image found for \`${content}\` on https://yande.re/`);
}));
