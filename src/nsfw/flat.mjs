import nsfw from "../../lib/nsfw.mjs";
import typing from "../../lib/typing.mjs";

import Discord from "discord.js";
import snekfetch from "snekfetch";

export const flat = nsfw(typing(async (message, content) => await message.channel.send(new Discord.RichEmbed({
	description: `Here comes ~~my~~ small boobs.`,
	image: (await snekfetch.get("https://nekos.life/api/v2/img/smallboobs")).body,
}))));
