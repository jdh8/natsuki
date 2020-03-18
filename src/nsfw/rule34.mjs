import nsfw from "../lib/nsfw.mjs";
import pick from "../lib/pick.mjs";
import query from "../lib/query.mjs";
import score from "../lib/score.mjs";
import typing from "../lib/typing.mjs";

import snekfetch from "snekfetch";
import xml2js from "xml2js";
import util from "util";

const xml = util.promisify(xml2js.parseString);

export const rule34 = nsfw(typing(async (message, content) =>
{
	const { raw } = await snekfetch.get(`https://rule34.xxx/index.php?page=dapi&s=post&q=index&tags=${query(content)}`);
	const posts = (await xml(raw)).posts.post;
	return await message.channel.send(posts ? score(pick(posts).$) : `No image found for \`${content}\` on https://rule34.xxx/`);
}));

export const r34 = rule34;
