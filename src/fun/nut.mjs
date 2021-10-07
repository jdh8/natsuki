export const nut = (action, content) =>
	action.reply(`${action.member || action.author} nuts on ${content || "the floor"}.
<:pukesuki:405984820674428928> **You guys are so gross!**`);
