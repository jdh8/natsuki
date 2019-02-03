export default string => string.split(/\s+/).map(encodeURIComponent).join("+");
