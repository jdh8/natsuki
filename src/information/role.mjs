const best = (collection, name) =>
{
	const filtered = collection.filter(x => x.name.toLowerCase().includes(name.toLowerCase()));

	return filtered.size ? filtered.reduce((x, y) => x.name.length < y.name.length ? x : y) : null;
};

export const role = (message, content) =>
{
	if (!content)
		return message.reply("Please specify role to search.");

	const { cache } = message.guild.roles;
	const mention = /\d+/.exec(content);
	const role = mention && cache.get(mention[0]) || best(cache, content);

	if (role == null)
		return message.reply("This role is not found.");

	return message.reply({ embeds: [{
		color: role.color,
		description: `${role} (${role.id})`,
		fields: [
			{ name: "Color", value: role.hexColor, inline: true },
			{ name: "Hoist", value: role.hoist, inline: true },
			{ name: "Managed", value: role.managed, inline: true },
			{ name: "Mentionable", value: role.mentionable, inline: true },
		]
	}]}).catch(() => message.reply(`${role} (${role.id})
**Color:** ${role.hexColor}
**Hoist:** ${role.hoist}
**Managed:** ${role.managed}
**Mentionable:** ${role.mentionable}`));
};
