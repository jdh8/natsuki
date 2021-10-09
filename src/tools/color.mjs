import { MessageAttachment } from "discord.js";
import sharp from "sharp";
import tinycolor from "tinycolor2";

const convert = ({ r, g, b, a }) => ({ r, g, b, alpha: a });

export const color = async (action, option) =>
{
	const value = option.value ?? option;
	const color = new tinycolor(value);
	const opaque = color.getAlpha() == 1;

	if (!color.isValid())
		return await action.reply(`${ value } is not a color.`);

	const description = `**Hex:** ${ opaque ? color.toHexString() : color.toHex8String() }
**RGB:** ${ color.toRgbString() }
**HSL:** ${ color.toHslString() }`;

	const buffer = sharp({ create: {
		width: 128,
		height: 128,
		channels: 4 - opaque,
		background: convert(color.toRgb())
	}}).webp({ lossless: true }).toBuffer();

	return await action.reply({
		content: description,
		files: [new MessageAttachment(await buffer, "color.webp")]
	});
};

export const colour = color;
