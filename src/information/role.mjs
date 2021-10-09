export const role = (action, option) =>
{
	const role = option.role ?? action.guild.roles.resolve(/\d+/.exec(option));

	if (role == null)
		return action.reply("This role is not found.");

	return action.reply({ embeds: [{
		color: role.color,
		description: `${ role } (${ role.id })`,
		fields: [
			{ name: "Color", value: role.hexColor, inline: true },
			{ name: "Hoist", value: role.hoist, inline: true },
			{ name: "Managed", value: role.managed, inline: true },
			{ name: "Mentionable", value: role.mentionable, inline: true },
		]
	}]}).catch(() => action.reply(`${ role } (${ role.id })
**Color:** ${ role.hexColor }
**Hoist:** ${ role.hoist }
**Managed:** ${ role.managed }
**Mentionable:** ${ role.mentionable }`));
};
