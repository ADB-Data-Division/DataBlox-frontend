export const normalizeAsKey = (value: string) => {
	return value.toLowerCase().replace(/ /g, '');
}