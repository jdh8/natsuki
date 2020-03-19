import Discord from "discord.js";

const best = (collection, name) =>
{
	const filtered = collection.filter(x => x.name.toLowerCase().includes(name.toLowerCase()));

	return filtered.size ? filtered.reduce((x, y) => x.name.length < y.name.length ? x : y) : null;
};

export const role = (message, content) =>
{
	if (!content)
		return message.channel.send("Please specify role to search.");

	const { cache } = message.guild.roles;
	const mention = /\d+/.exec(content);
	const role = mention && cache.get(mention[0]) || best(cache, content);

	if (role == null)
		return message.channel.send("This role is not found.");

	return message.channel.send(new Discord.MessageEmbed({
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
