import avt from "../lib/avatar.mjs";
import Discord from "discord.js";

const best = (collection, name) =>
{
	const pattern = new RegExp(name, "i");
	const filtered = collection.filterArray(x => pattern.test(x.name));

	return filtered.length ? filtered.reduce((x, y) => x.name.length < y.name.length ? x : y) : null;
};

export const avatar = (message, content) =>
	message.channel.send(avt(message.client.users.get(/\d+|$/.exec(content)[0]) || message.author, 2048));

export const role = (message, content) =>
{
	if (!content)
		return message.channel.send("Please specify role to search.");

	const collection = message.guild.roles;
	const mention = /\d+/.exec(content);
	const role = mention ? collection.get(mention[0]) : best(collection, content);

	if (role == null)
		return message.channel.send("This role is not found.");

	return message.channel.send(new Discord.RichEmbed({
		color: role.color,
		description: `${role} (${role.id})`,
		fields: [
			{ name: "Color", value: role.hexColor, inline: true },
			{ name: "Hoist", value: role.hoist, inline: true },
			{ name: "Managed", value: role.managed, inline: true },
			{ name: "Mentionable", value: role.mentionable, inline: true },
		]
	})).catch(() => message.channel.send(`${role} (${role.id})
**Color:** ${role.hexColor}
**Hoist:** ${role.hoist}
**Managed:** ${role.managed}
**Mentionable:** ${role.mentionable}`));
};

export const snowflake = (message, content) =>
{
	const match = /\d+/.exec(content);

	if (match == null)
		return message.channel.send("No valid snowfake is found.");

	const deconstructed = Discord.SnowflakeUtil.deconstruct(match[0]);

	return message.channel.send(`**Date:** ${deconstructed.date.toISOString()}
**Worker:** ${deconstructed.workerID}
**Process:** ${deconstructed.processID}
**Increment:** ${deconstructed.increment}`);
};
