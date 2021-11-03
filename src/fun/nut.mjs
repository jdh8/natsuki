export const nut = (action, option) =>
	action.reply(`${ action.member ?? action.author } nuts on ${ (option?.value ?? option) || "the floor" }.
<:pukesuki:405984820674428928> **You guys are so gross!**`);
