export const avatar = (user, size) =>
{
	if (user.id == 1) return user.avatar;
	if (!user.avatar) return `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

	const extension = user.avatar.startsWith("a_") ? ".gif" : "";
	const query = size ? `?size=${size}` : "";

	return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}${extension}${query}`;
};
