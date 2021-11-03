export const bunny = (action, option) =>
	action.reply(`(\\\\\\_\\_/)
( • - •)
/つ ${ (option?.value ?? option) || " つ" }`);

export const rabbit = bunny;
