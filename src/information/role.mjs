const best = (collection, name) =>
{
	const filtered = collection.filter(x => x.name.toLowerCase().includes(name.toLowerCase()));

	return filtered.size ? filtered.reduce((x, y) => x.name.length < y.name.length ? x : y) : null;
};

export const role = (action, content) =>
{
	if (!content)
		return action.reply("Please specify role to search.");

	const { cache } = action.guild.roles;
	const mention = /\d+/.exec(content);
	const role = mention && cache.get(mention[0]) || best(cache, content);

	if (role == null)
		return action.reply("This role is not found.");

	return action.reply({ embeds: [{
		color: role.color,
		description: `${role} (${role.id})`,
		fields: [
			{ name: "Color", value: role.hexColor, inline: true },
			{ name: "Hoist", value: role.hoist, inline: true },
			{ name: "Managed", value: role.managed, inline: true },
			{ name: "Mentionable", value: role.mentionable, inline: true },
		]
	}]}).catch(() => action.reply(`${role} (${role.id})
**Color:** ${role.hexColor}
**Hoist:** ${role.hoist}
**Managed:** ${role.managed}
**Mentionable:** ${role.mentionable}`));
};
