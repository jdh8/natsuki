import fetch from "node-fetch";
import sharp from "sharp";

export default async (user, size, top, left) =>
{
	const buffer = await (await fetch(user.displayAvatarURL({ size }))).buffer();
	const image = sharp(buffer);

	if ((await image.metadata()).width == size)
		return { input: buffer, top, left };

	const { data, info } = await image.resize(size).raw().toBuffer({ resolveWithObject: true });
	return { input: data, raw: info, top, left };
};
